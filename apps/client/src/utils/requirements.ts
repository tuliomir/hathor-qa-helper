/** Requirement model behind PreconditionStrip and ExecuteBar's disabled reason. */

export interface Requirement {
  id: string;
  /** Noun used in the "Ready: …" summary, e.g. "Test wallet". */
  short: string;
  /** Sentence for the chip, e.g. "RPC session not connected". */
  label: string;
  met: boolean | 'pending';
  /** Imperative used as ExecuteBar's disabled reason: "Connect an RPC session". */
  action?: string;
  fix?: { label: string; to: string };
}

const rank = (r: Requirement) => (r.met === false ? 0 : r.met === 'pending' ? 1 : 2);

/** Unmet first, then pending, then met. */
export function sortRequirements(requirements: readonly Requirement[]): Requirement[] {
  return requirements
    .map((r, i) => [r, i] as const)
    .sort(([a, ai], [b, bi]) => rank(a) - rank(b) || ai - bi)
    .map(([r]) => r);
}

/** Why the primary action is blocked, or null when every requirement is met. */
export function firstUnmetReason(requirements: readonly Requirement[]): string | null {
  const first = sortRequirements(requirements).find((r) => r.met !== true);
  return first ? (first.action ?? first.label) : null;
}
