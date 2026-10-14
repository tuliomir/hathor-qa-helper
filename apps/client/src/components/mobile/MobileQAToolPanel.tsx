/**
 * Mobile QA Tool Panel Component
 * Renders embedded tool/stage components based on step configuration
 */

import { useAppSelector } from '../../store/hooks';
import { selectCurrentLocation } from '../../store/slices/mobileQAProgressSlice';
import { getStep, getComponent } from '../../config/mobileQA';
import { EmptyState } from '../ui/EmptyState';
import { Callout } from '../ui/Callout';

export default function MobileQAToolPanel() {
  const currentLocation = useAppSelector(selectCurrentLocation);
  const { sectionId, stepId } = currentLocation;

  const step = getStep(sectionId, stepId);

  if (!step?.tool) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState>No embedded tool for this step. Follow the instructions to complete it manually.</EmptyState>
      </div>
    );
  }

  const Component = getComponent(step.tool.componentKey);

  if (!Component) {
    return (
      <div className="p-4 md:p-6">
        <Callout tone="error" title="Tool not available" role="alert">
          The tool <code className="font-mono text-data-sm">{step.tool.componentKey}</code> could not be loaded.
        </Callout>
      </div>
    );
  }

  return (
    <section aria-label="Step tool" className="flex flex-col gap-4 p-4 md:p-6">
      <Component />
    </section>
  );
}
