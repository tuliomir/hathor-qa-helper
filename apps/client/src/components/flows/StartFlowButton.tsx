/**
 * StartFlowButton — starts an automatic run of `flow` from a stage header.
 * Disabled while a run is in progress (the run panel controls it then).
 */

import { useSelector } from 'react-redux';
import { MdPlayArrow } from 'react-icons/md';
import type { RootState } from '../../store';
import type { FlowDefinition } from '../../flows/flowRunner';
import { useFlowControls } from './useFlowControls';

export function StartFlowButton({ flow, label }: { flow: FlowDefinition; label: string }) {
  const status = useSelector((state: RootState) => state.flowRun.status);
  const { start } = useFlowControls();
  const busy = status !== 'idle' && status !== 'passed' && status !== 'failed';

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={() => start(flow)}
      disabled={busy}
      title={busy ? 'A run is in progress: use the run panel' : undefined}
    >
      <MdPlayArrow aria-hidden="true" />
      {label}
    </button>
  );
}

export default StartFlowButton;
