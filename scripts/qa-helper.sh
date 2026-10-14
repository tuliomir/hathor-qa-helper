#!/usr/bin/env bash
# Start, stop and inspect a local QA Helper: the client dev server, the QA
# server, and (optionally) a tailnet HTTPS URL in front of the client.
#
#   scripts/qa-helper.sh up [--json]       start everything and wait until it answers
#   scripts/qa-helper.sh down [--json]     stop everything this script started
#   scripts/qa-helper.sh status [--json]   probe what is running
#   scripts/qa-helper.sh logs [client|server]
#
# Both processes run as transient systemd user units, not as children of the
# caller, so they outlive the terminal or agent that started them and log to
# the journal (`journalctl --user -u qa-helper-client`). Status probes the
# services instead of trusting bookkeeping.
#
# Environment:
#   QA_HELPER_DIR       repo to run (default: the repo containing this script)
#   QA_HELPER_TAILNET   1 to publish on the tailnet with `tailscale serve` (default 1)
#   QA_HELPER_TS_PORT   tailnet HTTPS port (default 8443; kept off 443 so `down`
#                       never removes another service's serve config)

set -euo pipefail

REPO="${QA_HELPER_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TAILNET="${QA_HELPER_TAILNET:-1}"
TS_PORT="${QA_HELPER_TS_PORT:-8443}"
CLIENT_PORT=5173
SERVER_PORT=5180
CLIENT_UNIT=qa-helper-client
SERVER_UNIT=qa-helper-server
READY_TIMEOUT_S=60

json=0
cmd="${1:-status}"
shift || true
for arg in "$@"; do
  case "$arg" in
    --json) json=1 ;;
    client | server) log_target="$arg" ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

log() { [ "$json" = 1 ] || echo "$@"; }

bun_bin() {
  command -v bun || { [ -x "$HOME/.bun/bin/bun" ] && echo "$HOME/.bun/bin/bun"; } || {
    echo "bun not found" >&2
    exit 1
  }
}

# `<machine>.<tailnet>.ts.net`, or empty when Tailscale is unavailable.
ts_dns_name() {
  command -v tailscale >/dev/null || return 0
  tailscale status --json 2>/dev/null |
    "$(bun_bin)" -e 'const s = JSON.parse(await Bun.stdin.text()); console.log((s.Self?.DNSName ?? "").replace(/\.$/, ""))' 2>/dev/null || true
}

http_ok() { curl -s -o /dev/null -m 2 -w '%{http_code}' "$1" 2>/dev/null | grep -q '^[23]'; }
unit_active() { systemctl --user --quiet is-active "$1"; }

ts_serving() {
  command -v tailscale >/dev/null || return 1
  tailscale serve status --json 2>/dev/null | grep -q "\"[^\"]*:$TS_PORT\""
}

status_json() {
  local dns client server tailnet url tsurl=""
  dns="$(ts_dns_name)"
  http_ok "http://127.0.0.1:$CLIENT_PORT/" && client=true || client=false
  http_ok "http://127.0.0.1:$SERVER_PORT/health" && server=true || server=false
  ts_serving && tailnet=true || tailnet=false
  [ -n "$dns" ] && tsurl="https://$dns:$TS_PORT/"
  url="http://localhost:$CLIENT_PORT/"
  [ "$tailnet" = true ] && url="$tsurl"
  local running=false
  [ "$client" = true ] && [ "$server" = true ] && running=true
  printf '{"running":%s,"url":"%s","client":{"up":%s,"ours":%s,"port":%s},"server":{"up":%s,"ours":%s,"port":%s},"tailnet":{"serving":%s,"url":"%s"},"repo":"%s"}\n' \
    "$running" "$url" \
    "$client" "$(unit_active $CLIENT_UNIT && echo true || echo false)" "$CLIENT_PORT" \
    "$server" "$(unit_active $SERVER_UNIT && echo true || echo false)" "$SERVER_PORT" \
    "$tailnet" "$tsurl" "$REPO"
}

print_status() {
  if [ "$json" = 1 ]; then
    status_json
    return
  fi
  local s
  s="$(status_json)"
  echo "$s" | "$(bun_bin)" -e '
    const s = JSON.parse(await Bun.stdin.text());
    const mark = (up, ours) => (up ? (ours ? "up" : "up (not started by this script)") : "down");
    console.log(`client   ${mark(s.client.up, s.client.ours)}  :${s.client.port}`);
    console.log(`server   ${mark(s.server.up, s.server.ours)}  :${s.server.port}`);
    console.log(`tailnet  ${s.tailnet.serving ? s.tailnet.url : "off"}`);
    console.log(`open     ${s.running ? s.url : "-"}`);'
}

# Refuse to start a second copy onto a port something else already holds.
start_unit() {
  local unit="$1" port="$2" probe="$3"
  shift 3
  if unit_active "$unit"; then return 0; fi
  if http_ok "$probe"; then
    echo "port $port is already in use by something this script did not start; stop it first" >&2
    exit 1
  fi
  systemctl --user reset-failed "$unit" 2>/dev/null || true
  systemd-run --user --unit="$unit" --collect --quiet --same-dir -E PATH="$(dirname "$(bun_bin)"):/usr/bin:/bin" "$@"
}

wait_for() {
  local what="$1" url="$2" unit="$3" deadline=$((SECONDS + READY_TIMEOUT_S))
  until http_ok "$url"; do
    if ! unit_active "$unit"; then
      echo "$what exited during startup; see: journalctl --user -u $unit -n 50" >&2
      exit 1
    fi
    if [ $SECONDS -ge $deadline ]; then
      echo "$what not ready after ${READY_TIMEOUT_S}s; see: journalctl --user -u $unit -n 50" >&2
      exit 1
    fi
    sleep 0.5
  done
}

up() {
  [ -d "$REPO/apps/client" ] || { echo "$REPO is not the QA Helper monorepo" >&2; exit 1; }
  local bun dns origin=""
  bun="$(bun_bin)"
  dns=""
  [ "$TAILNET" = 1 ] && dns="$(ts_dns_name)"
  [ -n "$dns" ] && origin="https://$dns:$TS_PORT"

  if [ ! -d "$REPO/node_modules" ]; then
    log "Installing dependencies…"
    (cd "$REPO" && "$bun" install >/dev/null)
  fi

  log "Starting QA server…"
  (cd "$REPO/apps/server" && start_unit $SERVER_UNIT $SERVER_PORT "http://127.0.0.1:$SERVER_PORT/health" \
    -E QA_SERVER_PORT=$SERVER_PORT -E QA_SERVER_EXTRA_ORIGINS="$origin" \
    "$bun" src/index.ts)

  log "Starting client…"
  (cd "$REPO/apps/client" && start_unit $CLIENT_UNIT $CLIENT_PORT "http://127.0.0.1:$CLIENT_PORT/" \
    -E __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="$dns" \
    "$bun" x vite --port $CLIENT_PORT --strictPort)

  wait_for "QA server" "http://127.0.0.1:$SERVER_PORT/health" $SERVER_UNIT
  wait_for "Client" "http://127.0.0.1:$CLIENT_PORT/" $CLIENT_UNIT

  if [ -n "$dns" ] && ! ts_serving; then
    log "Publishing on the tailnet…"
    tailscale serve --bg --https="$TS_PORT" "http://127.0.0.1:$CLIENT_PORT" >/dev/null
  fi
  print_status
}

down() {
  if ts_serving; then
    log "Removing tailnet URL…"
    tailscale serve --https="$TS_PORT" off >/dev/null 2>&1 || true
  fi
  for unit in $CLIENT_UNIT $SERVER_UNIT; do
    if unit_active "$unit"; then
      log "Stopping $unit…"
      # The server stops its wallets on SIGTERM before exiting.
      systemctl --user stop "$unit"
    fi
  done
  print_status
}

case "$cmd" in
  up) up ;;
  down) down ;;
  status) print_status ;;
  logs)
    case "${log_target:-}" in
      client) journalctl --user -u $CLIENT_UNIT -f ;;
      server) journalctl --user -u $SERVER_UNIT -f ;;
      *) journalctl --user -u $CLIENT_UNIT -u $SERVER_UNIT -f ;;
    esac
    ;;
  *) echo "usage: $0 up|down|status|logs [client|server] [--json]" >&2; exit 2 ;;
esac
