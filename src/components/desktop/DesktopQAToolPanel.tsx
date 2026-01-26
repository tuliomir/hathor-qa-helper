/**
 * Desktop QA Tool Panel Component
 * Renders embedded tool/stage components based on step configuration
 */

import { useAppSelector } from '../../store/hooks';
import { selectCurrentLocation } from '../../store/slices/desktopQAProgressSlice';
import { getComponent, getStep } from '../../config/desktopQA';

export default function DesktopQAToolPanel() {
  const currentLocation = useAppSelector(selectCurrentLocation);
  const { sectionId, stepId } = currentLocation;

  const step = getStep(sectionId, stepId);

  // If no tool configured for this step, show placeholder
  if (!step?.tool) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-muted p-8">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-lg font-medium m-0">No embedded tool for this step</p>
          <p className="text-sm mt-2 m-0">
            Follow the instructions on the left to complete this step manually.
          </p>
        </div>
      </div>
    );
  }

  // Get the component from registry
  const Component = getComponent(step.tool.componentKey);

  if (!Component) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50">
        <div className="text-center text-danger p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-medium m-0">Component not found</p>
          <p className="text-sm mt-2 m-0">
            The tool "{step.tool.componentKey}" could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  // Render the component
  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4">
      <Component />
    </div>
  );
}
