/**
 * Mobile QA Configuration - Main Entry Point
 */

import type { MobileQAConfig, SectionConfig, StepConfig } from '../../types/mobileQA';
import { appUpdateSection } from './sections/appUpdate';
import { newWalletSection } from './sections/newWallet';
import { generateTokenErrorSection } from './sections/generateTokenError';

/**
 * Complete Mobile QA configuration
 */
export const mobileQAConfig: MobileQAConfig = {
  version: '1.0.0',
  sections: [appUpdateSection, newWalletSection, generateTokenErrorSection],
};

/**
 * Get all sections
 */
export function getSections(): SectionConfig[] {
  return mobileQAConfig.sections;
}

/**
 * Get a section by ID
 */
export function getSection(sectionId: string): SectionConfig | undefined {
  return mobileQAConfig.sections.find((s) => s.id === sectionId);
}

/**
 * Get a step by section ID and step ID
 */
export function getStep(sectionId: string, stepId: string): StepConfig | undefined {
  const section = getSection(sectionId);
  return section?.steps.find((s) => s.id === stepId);
}

/**
 * Get the total number of steps across all sections
 */
export function getTotalStepsCount(): number {
  return mobileQAConfig.sections.reduce((total, section) => total + section.steps.length, 0);
}

/**
 * Get step IDs for a section
 */
export function getStepIds(sectionId: string): string[] {
  const section = getSection(sectionId);
  return section?.steps.map((s) => s.id) || [];
}

/**
 * Get the next step in the walkthrough
 * Returns null if at the end
 */
export function getNextStep(
  currentSectionId: string,
  currentStepId: string
): { sectionId: string; stepId: string } | null {
  const sections = mobileQAConfig.sections;
  const currentSectionIndex = sections.findIndex((s) => s.id === currentSectionId);

  if (currentSectionIndex === -1) return null;

  const currentSection = sections[currentSectionIndex];
  const currentStepIndex = currentSection.steps.findIndex((s) => s.id === currentStepId);

  if (currentStepIndex === -1) return null;

  // Try next step in current section
  if (currentStepIndex < currentSection.steps.length - 1) {
    return {
      sectionId: currentSectionId,
      stepId: currentSection.steps[currentStepIndex + 1].id,
    };
  }

  // Try first step of next section
  if (currentSectionIndex < sections.length - 1) {
    const nextSection = sections[currentSectionIndex + 1];
    return {
      sectionId: nextSection.id,
      stepId: nextSection.steps[0].id,
    };
  }

  return null;
}

/**
 * Get the previous step in the walkthrough
 * Returns null if at the beginning
 */
export function getPreviousStep(
  currentSectionId: string,
  currentStepId: string
): { sectionId: string; stepId: string } | null {
  const sections = mobileQAConfig.sections;
  const currentSectionIndex = sections.findIndex((s) => s.id === currentSectionId);

  if (currentSectionIndex === -1) return null;

  const currentSection = sections[currentSectionIndex];
  const currentStepIndex = currentSection.steps.findIndex((s) => s.id === currentStepId);

  if (currentStepIndex === -1) return null;

  // Try previous step in current section
  if (currentStepIndex > 0) {
    return {
      sectionId: currentSectionId,
      stepId: currentSection.steps[currentStepIndex - 1].id,
    };
  }

  // Try last step of previous section
  if (currentSectionIndex > 0) {
    const prevSection = sections[currentSectionIndex - 1];
    return {
      sectionId: prevSection.id,
      stepId: prevSection.steps[prevSection.steps.length - 1].id,
    };
  }

  return null;
}

// Re-export component registry
export { getComponent } from './components';
