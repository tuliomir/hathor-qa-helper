# Passkey wallets

Status (2026-10-15): **paused, not built.** The research is done and a local setup is ready; the last step (running it from the Mac with 1Password) was not tried. This file is everything needed to pick it up again.

Goal: open, in the QA Helper, a wallet created in the Hathor mobile app with a passkey instead of seed words. Such a wallet has no seed to copy.

## How Hathor passkey wallets work

Source: HathorNetwork/hathor-wallet-mobile, `src/passkey/passkeyService.js` and `passkeySigner.js` (PRs #896, #897, #918 and the later `feat(passkey)` PRs). The web wallet (in `hathor-rpc-lib`) and the desktop wallet (`hathor-wallet`) have no passkey code; `hathor-rpc-lib` #183 only serves the association files the mobile app needs.

- **Derivation:** a WebAuthn assertion with the PRF extension, `prf: { eval: { first: utf8('hathor-passkey/prf/v1') } }`, `userVerification: 'required'`. The 32-byte `results.first` is used directly as BIP39 entropy: `walletUtils.generateWalletWords(Buffer.from(prf))` gives 24 words, and from there it is an ordinary HD wallet (`m/44'/280'/0'`). No HKDF, no server, no other secret. The passkey never signs transactions.
- **User verification must be required.** CTAP2 hmac-secret keeps different secrets with and without UV, so a non-verified assertion derives a different wallet. The mobile app rejects assertions without the UV flag.
- **rpId:** `wallet.hathor.network` since #918 (2026-10-13). Earlier test wallets used `wallet.hathor.dev` and can't be opened any more; the user only uses the new ones.
- **What the app stores:** only the xpub and the credential id. Every signature re-runs the passkey prompt.
- **Verified here:** wallet-lib 4.2.0 (the QA Helper's version) turns 32 zero bytes into "abandon ×23 art", matching the mobile team's fixture (`hathor-next/web-next/test/fixtures/passkey-derivation/v1.json`). Address 0 is `deriveAddressFromXPubP2PKH(xpubDeriveChild(getXPubKeyFromSeed(words, { accountDerivationIndex: "0'" }), 0), 0, network)`.
- **iOS path checked:** react-native-passkey 3.5.0 passes the salt bytes unchanged to `ASAuthorizationPublicKeyCredentialPRFAssertionInput`, returns the result as standard base64, and the app decodes it correctly. If the QA Helper gets the same PRF output, it gets the same wallet.

## Why the QA Helper can't just ask for the passkey

A passkey only works on pages whose host is its rpId (or a subdomain). The QA Helper runs on `localhost` and on `https://tulio-g7-7588.tailf0da27.ts.net:8443`.

- **Asking for rpId `wallet.hathor.network` from the tailnet address** fails in the browser before 1Password is involved: `SecurityError: The relying party ID is not a registrable domain suffix of, nor equal to the current domain. Subsequently, the .well-known/webauthn resource of the claimed RP ID had the wrong content-type.`
- **Related Origin Requests** (`https://wallet.hathor.network/.well-known/webauthn` listing other origins) don't help: Hathor doesn't publish the file, localhost can't be listed, and 1Password doesn't support them ([forum](https://www.1password.community/discussions/1password/webauthn-support-of-related-origin-requests/42002)).
- **Adding the tailnet address as a "website" on the 1Password item** doesn't make the passkey usable there. 1Password treats the item as a login for that site ("Go to the sign-in page to continue") and only offers passkeys whose rpId matches the page. On the tailnet page it offered a different passkey, "G7 PassWallet", whose wallet does not match. Watch the label the probe prints: it tells you which passkey answered.
- **Exporting the passkey from 1Password:** `op` shows no passkey data, 1PUX exports exclude passkeys, and passkey export only exists on iOS through Credential Exchange ([staff](https://www.1password.community/1password-at-home-31/does-exporting-export-passkeys-24349)).
- **Chrome virtual authenticators** (CDP `WebAuthn.addCredential`) can import a private key but not the PRF secret, so they can't impersonate a real passkey. They can only make new test passkeys, tied to whatever rpId the page uses, which the mobile app can't open.
- 1Password's browser extension does return PRF results, but as a plain `Array` instead of an `ArrayBuffer` (1Password bug FS-5593). Accept arrays.

## The plan: serve the QA Helper as `wallet.hathor.network`

Make one browser on the QA's Mac resolve `wallet.hathor.network` to the QA Helper dev server, with a certificate the Mac trusts for that name. Then 1Password offers the real passkey and returns its PRF output.

### Linux side (done; files survive worktree cleanup)

`~/.local/share/qa-helper-passkey/` holds:

- `ca.pem`: a certificate authority **name-constrained to `wallet.hathor.network`** (`nameConstraints = critical, permitted;DNS:wallet.hathor.network`, `pathlen:0`). Its private key was shredded right after signing, so it can never issue another certificate. SHA-256 fingerprint `24:E1:CC:57:A0:03:13:C1:AA:9C:25:A9:5C:9C:83:02:42:49:9B:8D:46:D2:51:F2:62:2A:CD:29:34:21:2C:1E`.
- `server.pem` / `server.key`: the server certificate for `wallet.hathor.network`, valid until 2027-10-15.
- `ca.cnf` / `leaf.cnf`: the OpenSSL configs used. To regenerate (new fingerprint, so the Mac must trust the new CA):
  ```bash
  cd ~/.local/share/qa-helper-passkey
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -keyout ca.key -out ca.pem -days 365 -config ca.cnf
  openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -keyout server.key -out server.csr -subj "/CN=wallet.hathor.network"
  openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out server.pem -days 365 -extfile leaf.cnf
  shred -u ca.key && rm -f server.csr ca.srl && chmod 600 server.key
  ```
- `qa-passkey-mac.sh`: the Mac script (below), with `ca.pem` and its fingerprint embedded. Regenerate it if the CA changes.

`vite.config.ts` serves HTTPS when `QA_HTTPS_CERT` and `QA_HTTPS_KEY` are set. Run a dev instance on the tailnet IP only (`tailscale ip -4`, here `100.121.202.116`), with its own QA server accepting that origin:

```bash
# apps/server
QA_SERVER_PORT=5181 QA_SERVER_EXTRA_ORIGINS=https://wallet.hathor.network:8445 bun src/index.ts
# apps/client
D=~/.local/share/qa-helper-passkey
QA_SERVER_PORT=5181 QA_HTTPS_CERT=$D/server.pem QA_HTTPS_KEY=$D/server.key \
  __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=wallet.hathor.network \
  bun x vite --host 100.121.202.116 --port 8445 --strictPort
```

Checked from Linux: TLS validates against `ca.pem`, `/qa-server/health` answers, and the fullnode websocket connects through `/hathor-node/testnet/v1a/ws/`. Vite must run on Node, as everywhere (see `development-practices.md`).

To hand the script to the Mac, copy it into `apps/client/public/passkey-setup/` (git-excluded) and download it from the tailnet copy of the app (e.g. `https://tulio-g7-7588.tailf0da27.ts.net:8444/passkey-setup/qa-passkey-mac.sh`, with `tailscale serve --bg --https=8444 http://127.0.0.1:5174`).

### Mac side (not run yet)

Run in a terminal **on the Mac**, not one SSH'd into the Linux box (the first attempt ran on Linux and failed with `security: command not found`):

```bash
bash ~/qa-passkey-mac.sh install    # trust the CA in the login keychain, SSL only (asks for the password)
bash ~/qa-passkey-mac.sh open       # separate Chrome profile with --host-resolver-rules="MAP wallet.hathor.network 100.121.202.116"
bash ~/qa-passkey-mac.sh status
bash ~/qa-passkey-mac.sh uninstall  # remove the CA and the Chrome profile
```

In that window, install and sign in to the 1Password extension once, open `https://wallet.hathor.network:8445/passkey-probe.html`, and choose the passkey.

Why a separate profile: Chrome reads `--host-resolver-rules` only at launch (a running Chrome ignores it), and while active the real `wallet.hathor.network` is unreachable in that browser. Alternatives the user asked about: quit Chrome and relaunch the normal profile with the flag (lasts until Chrome quits), or toggle a marked line in the Mac's `/etc/hosts` (affects every app; Chrome's own DNS cache is at `chrome://net-internals/#dns`).

### The probe page

`apps/client/passkey-probe.html` (dev only; not part of the app build). One prompt asks for PRF with two salts: the raw salt (what the mobile app sends) and the salt pre-hashed as `SHA-256("WebAuthn PRF" || 0x00 || salt)` (to catch a provider that hashes differently). It shows the passkey label, the UV flag, the PRF result type and each wallet's first testnet and mainnet address. It never shows the seed and stores nothing.

Success: label "Qa 40.0-rc1" and first testnet address `WgYxrPPFXgMRefkMAbZwKJkUYeyqon4stw` (mainnet `HQQ4MoYk6j4WfN9VMkaRKAmWn1UiQqw46x`) from the raw salt.

## When it works: the feature to build

- An "Add passkey wallet" action that runs the same request on the `wallet.hathor.network` origin, derives the 24 words and adds the wallet like any seed wallet, marked as a passkey wallet and labelled from the `userHandle` (the label is the bytes before the first `0x00`).
- After that the wallet is a normal seed wallet: its words can be added on the usual tailnet copy too, so the passkey step happens once per wallet.
- Keep mainnet funds out of passkey wallets opened here: the QA Helper keeps seeds in browser storage.
- Until then, wallets known only by their address are handled as address-only wallets (see the address-only wallet feature).
