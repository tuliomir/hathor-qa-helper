/**
 * Shown by blueprint stages when the active network has no QA blueprints.
 */

export default function BlueprintUnavailable({ kind, networkLabel }: { kind: string; networkLabel: string }) {
  return (
    <div role="alert" className="alert alert-warning mb-7.5">
      <span>
        The {kind} blueprint is not available on <strong>{networkLabel}</strong>. The QA blueprints are deployed on
        Testnet only; switch to Testnet to use this stage.
      </span>
    </div>
  );
}
