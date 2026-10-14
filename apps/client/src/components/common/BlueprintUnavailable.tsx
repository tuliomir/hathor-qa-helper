/**
 * Shown by blueprint stages when the active network has no QA blueprints.
 */

import { Callout } from '../ui/Callout';

export interface BlueprintUnavailableProps {
  /** Blueprint name, e.g. "Bet". */
  kind: string;
  networkLabel: string;
  /** What the tester switches to Testnet, e.g. "test wallet" or "snap". */
  switchWhat: string;
}

export function BlueprintUnavailable({ kind, networkLabel, switchWhat }: BlueprintUnavailableProps) {
  return (
    <Callout tone="warning" title={`${kind} blueprint not available on ${networkLabel}`} role="status">
      The QA blueprints are deployed on Testnet only. Switch the {switchWhat} to Testnet to use this stage.
    </Callout>
  );
}

export default BlueprintUnavailable;
