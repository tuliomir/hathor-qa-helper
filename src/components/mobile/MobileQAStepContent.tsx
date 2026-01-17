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
import {
  MdCheckCircle,
  MdNavigateNext,
  MdNavigateBefore,
  MdRadioButtonUnchecked,
} from 'react-icons/md';

/**
 * Simple markdown-like rendering for instructions
 * Supports **bold** formatting
 */
function renderInstructions(text: string): React.ReactNode {
  // Split by **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text
      return (
        <strong key={index} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

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
      <div className="p-6">
        <div className="card-primary bg-red-50 border border-danger">
          <p className="text-danger m-0">Step not found. Please select a step from the sidebar.</p>
        </div>
      </div>
    );
  }

  // Calculate step number within section
  const stepIndex = section.steps.findIndex((s) => s.id === stepId);
  const stepNumber = stepIndex + 1;

  return (
    <div className="p-6">
      {/* Section and Step Header */}
      <div className="mb-6">
        <div className="text-sm text-muted mb-1">{section.title}</div>
        <h1 className="text-2xl font-bold m-0 flex items-center gap-3">
          <span className="text-purple-600">Step {stepNumber}:</span>
          <span>{step.title}</span>
          {isCompleted && <MdCheckCircle className="text-success" size={28} />}
        </h1>
      </div>

      {/* Instructions Card */}
      <div className="card-primary mb-6">
        <h2 className="text-lg font-bold mb-3">Instructions</h2>
        <p className="text-base leading-relaxed m-0">{renderInstructions(step.instructions)}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={!prevStep}
            className={`btn flex items-center gap-1 ${
              prevStep ? 'btn-secondary' : 'btn-secondary opacity-50 cursor-not-allowed'
            }`}
          >
            <MdNavigateBefore size={20} />
            Previous
          </button>

          {/* Toggle Complete Button */}
          <button
            onClick={handleToggleComplete}
            className={`btn flex items-center gap-2 ${
              isCompleted ? 'btn-warning' : 'btn-success'
            }`}
          >
            {isCompleted ? (
              <>
                <MdRadioButtonUnchecked size={18} />
                Mark Incomplete
              </>
            ) : (
              <>
                <MdCheckCircle size={18} />
                Mark Complete
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Complete & Next Button */}
          {!isCompleted && nextStep && (
            <button onClick={handleCompleteAndNext} className="btn btn-primary flex items-center gap-1">
              Complete & Next
              <MdNavigateNext size={20} />
            </button>
          )}

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!nextStep}
            className={`btn flex items-center gap-1 ${
              nextStep ? 'btn-secondary' : 'btn-secondary opacity-50 cursor-not-allowed'
            }`}
          >
            Next
            <MdNavigateNext size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
