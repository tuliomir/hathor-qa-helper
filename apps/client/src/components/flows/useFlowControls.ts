/**
 * Start, stop, resume, skip and end a flow run, with a toast when the
 * runner refuses (e.g. no RPC session, or dry run on).
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { flowDismissed, flowStepSkipped, flowStopRequested } from '../../store/slices/flowRunSlice';
import { resumeFlow, startFlow, type FlowDefinition } from '../../flows/flowRunner';
import { createFlowEnv } from '../../flows/flowEnv';
import { useToast } from '../../hooks/useToast';

export function useFlowControls() {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  const refuse = useCallback(
    (reason: string | null) => {
      if (reason) showToast(reason, 'error');
    },
    [showToast]
  );

  return {
    start: useCallback((flow: FlowDefinition) => refuse(startFlow(flow, createFlowEnv())), [refuse]),
    resume: useCallback((flow: FlowDefinition) => refuse(resumeFlow(flow, createFlowEnv())), [refuse]),
    stop: useCallback(() => dispatch(flowStopRequested()), [dispatch]),
    skip: useCallback(() => dispatch(flowStepSkipped()), [dispatch]),
    dismiss: useCallback(() => dispatch(flowDismissed()), [dispatch]),
  };
}
