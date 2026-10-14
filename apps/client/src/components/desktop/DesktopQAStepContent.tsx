/**
 * Desktop QA Step Content Component
 * Displays step instructions with inline tools and navigation controls
 */

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectCurrentLocation,
  selectStepStatus,
  setCurrentLocation,
  setStepStatus,
} from '../../store/slices/desktopQAProgressSlice';
import { refreshWalletBalance, refreshWalletTokens } from '../../store/slices/walletStoreSlice';
import { getComponent, getNextStep, getPreviousStep, getSection, getStep } from '../../config/desktopQA';
import MarkdownText from '../common/MarkdownText';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { StatusChip } from '../ui/StatusChip';
import StepNavigation from './StepNavigation';

/**
 * Inline tool component - renders the embedded tool for a step
 */
function InlineTool({ componentKey }: { componentKey: string }) {
  const Component = getComponent(componentKey);

  if (!Component) {
    return (
      <Callout tone="error" title="Tool not available">
        The tool <code className="font-mono text-data-sm">{componentKey}</code> could not be loaded.
      </Callout>
    );
  }

  return (
    <section aria-label="Step tool" className="flex flex-col gap-4 border-t border-base-300 pt-4">
      <Component />
    </section>
  );
}

export default function DesktopQAStepContent() {
  const dispatch = useAppDispatch();
  const currentLocation = useAppSelector(selectCurrentLocation);
  const { sectionId, stepId } = currentLocation;
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  const section = getSection(sectionId);
  const step = getStep(sectionId, stepId);
  const status = useAppSelector((state) => selectStepStatus(state, sectionId, stepId));

  const isCompleted = status === 'completed';
  const nextStep = getNextStep(sectionId, stepId);
  const prevStep = getPreviousStep(sectionId, stepId);

  /**
   * Refresh tokens for steps that create/modify tokens
   * Called when navigating away from token-creation steps
   */
  const refreshTokensIfNeeded = () => {
    // Refresh tokens after creating a token (createToken step-1)
    if (sectionId === 'create-token' && stepId === 'step-1' && testWalletId) {
      dispatch(refreshWalletTokens(testWalletId));
      dispatch(refreshWalletBalance(testWalletId));
    }
  };

  const handleToggleComplete = () => {
    dispatch(
      setStepStatus({
        sectionId,
        stepId,
        status: isCompleted ? 'pending' : 'completed',
      })
    );
  };

  const handleNext = () => {
    if (nextStep) {
      refreshTokensIfNeeded();
      dispatch(setCurrentLocation(nextStep));
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (prevStep) {
      dispatch(setCurrentLocation(prevStep));
      window.scrollTo(0, 0);
    }
  };

  const handleCompleteAndNext = () => {
    // Mark as completed
    dispatch(
      setStepStatus({
        sectionId,
        stepId,
        status: 'completed',
      })
    );

    // Navigate to next step if available
    if (nextStep) {
      refreshTokensIfNeeded();
      dispatch(setCurrentLocation(nextStep));
      window.scrollTo(0, 0);
    }
  };

  if (!section || !step) {
    return (
      <div className="p-4 md:p-6">
        <Callout tone="error" role="alert">
          Step not found. Select a step from the list of sections.
        </Callout>
      </div>
    );
  }

  // Calculate step number within section
  const stepIndex = section.steps.findIndex((s) => s.id === stepId);
  const stepNumber = stepIndex + 1;

  return (
    <div className="flex w-full max-w-stage flex-col gap-4 px-4 pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-0.5 text-left">
        <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
          {section.title} / Step <span className="font-mono">{stepNumber}</span> of{' '}
          <span className="font-mono">{section.steps.length}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="m-0 text-page">{step.title}</h1>
          {isCompleted && <StatusChip status="completed" label="Completed" tone="success" />}
        </div>
      </header>

      <Panel title="Instructions">
        <div className="max-w-prose text-body-lg text-left">
          <MarkdownText>{step.instructions}</MarkdownText>
        </div>
      </Panel>

      {step.toolHint && <Callout title="Tip">{step.toolHint}</Callout>}

      {step.tool && <InlineTool componentKey={step.tool.componentKey} />}

      <StepNavigation
        hasPrevious={!!prevStep}
        hasNext={!!nextStep}
        isCompleted={isCompleted}
        onPrevious={handlePrevious}
        onToggleComplete={handleToggleComplete}
        onCompleteAndNext={handleCompleteAndNext}
        onNext={handleNext}
      />
    </div>
  );
}
