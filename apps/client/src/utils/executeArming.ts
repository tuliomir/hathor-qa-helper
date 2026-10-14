/**
 * ExecuteBar's mainnet arming: on mainnet (and not dry run) the first click
 * arms the button and the second, within ARM_TIMEOUT_MS, fires.
 */

export interface ArmingContext {
  isMainnet: boolean;
  isDryRun: boolean;
}

export type ArmingState = 'idle' | 'armed';

export const ARM_TIMEOUT_MS = 4000;

export function needsArming({ isMainnet, isDryRun }: ArmingContext): boolean {
  return isMainnet && !isDryRun;
}

export function executeClick(state: ArmingState, ctx: ArmingContext): { state: ArmingState; fire: boolean } {
  if (!needsArming(ctx) || state === 'armed') return { state: 'idle', fire: true };
  return { state: 'armed', fire: false };
}

export function defaultMainnetLabel(label: string): string {
  return /^send\b/i.test(label) ? 'Send on mainnet' : `${label} on mainnet`;
}

export function executeButtonLabel(
  label: string,
  ctx: ArmingContext,
  state: ArmingState,
  mainnetLabel?: string
): string {
  if (!needsArming(ctx)) return label;
  const main = mainnetLabel ?? defaultMainnetLabel(label);
  return state === 'armed' ? `Click again to ${main[0].toLowerCase()}${main.slice(1)}` : main;
}
