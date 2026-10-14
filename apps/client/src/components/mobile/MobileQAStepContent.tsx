/**
 * Mobile QA Step Content Component
 * Displays step instructions with navigation and completion controls
 */

import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  selectCurrentLocation,
  selectStepStatus,
  setStepStatus,
  setCurrentLocation,
} from '../../store/slices/mobileQAProgressSlice';
import { getSection, getStep, getNextStep, getPreviousStep } from '../../config/mobileQA';
import MarkdownText from '../common/MarkdownText';
import StageHeader from '../common/StageHeader';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { StatusChip } from '../ui/StatusChip';
import StepNavigation from '../desktop/StepNavigation';

export default function MobileQAStepContent() {
  const dispatch = useAppDispatch();
  const currentLocation = useAppSelector(selectCurrentLocation);
  const { sectionId, stepId } = currentLocation;

  const section = getSection(sectionId);
  const step = getStep(sectionId, stepId);
  const status = useAppSelector((state) => selectStepStatus(state, sectionId, stepId));

  const isCompleted = status === 'completed';
  const nextStep = getNextStep(sectionId, stepId);
  const prevStep = getPreviousStep(sectionId, stepId);

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
      dispatch(setCurrentLocation(nextStep));
    }
  };

  const handlePrevious = () => {
    if (prevStep) {
      dispatch(setCurrentLocation(prevStep));
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
      dispatch(setCurrentLocation(nextStep));
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
      <StageHeader
        title={step.title}
        breadcrumb={
          <>
            {section.title} / Step <span className="font-mono">{stepNumber}</span> of{' '}
            <span className="font-mono">{section.steps.length}</span>
          </>
        }
        titleAdornment={isCompleted && <StatusChip status="completed" label="Completed" tone="success" />}
      />

      <Panel title="Instructions">
        <div className="max-w-prose text-body-lg text-left">
          <MarkdownText>{step.instructions}</MarkdownText>
        </div>
      </Panel>

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
