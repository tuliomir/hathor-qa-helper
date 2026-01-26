/**
 * Desktop QA Configuration - Main Entry Point
 */

import type { DesktopQAConfig, SectionConfig, StepConfig } from '../../types/desktopQA';

// Import all section configs
import { walletUpdateSection } from './sections/walletUpdate';
import { initializationSection } from './sections/initialization';
import { tokenEmptyWalletSection } from './sections/tokenEmptyWallet';
import { addressesSection } from './sections/addresses';
import { lockUnlockSection } from './sections/lockUnlock';
import { createTokenSection } from './sections/createToken';
import { transactionDetailCreationSection } from './sections/transactionDetailCreation';
import { sendTokensSection } from './sections/sendTokens';
import { transactionDetailTimelockSection } from './sections/transactionDetailTimelock';
import { tokenDetailsSection } from './sections/tokenDetails';
import { registerUnregisterSection } from './sections/registerUnregister';
import { administrativeToolsSection } from './sections/administrativeTools';
import { hideZeroBalanceSection } from './sections/hideZeroBalance';
import { tokenBarScrollSection } from './sections/tokenBarScroll';
import { changeServerSection } from './sections/changeServer';
import { addPassphraseSection } from './sections/addPassphrase';
import { notificationsBugReportSection } from './sections/notificationsBugReport';
import { reloadWalletSection } from './sections/reloadWallet';
import { registerSameNameSection } from './sections/registerSameName';
import { spendSameOutputSection } from './sections/spendSameOutput';
import { createNftSection } from './sections/createNft';
import { resetLockedSection } from './sections/resetLocked';
import { resetMenuSection } from './sections/resetMenu';
import { lateBackupSection } from './sections/lateBackup';

/**
 * Complete Desktop QA configuration
 */
export const desktopQAConfig: DesktopQAConfig = {
  version: '1.0.0',
  sourceUrl: 'https://github.com/HathorNetwork/hathor-wallet/blob/master/qa/QA.md',
  sections: [
    // Starting the Wallet
    walletUpdateSection,
    initializationSection,
    // Wallet Functionalities
    tokenEmptyWalletSection,
    addressesSection,
    lockUnlockSection,
    createTokenSection,
    transactionDetailCreationSection,
    sendTokensSection,
    transactionDetailTimelockSection,
    tokenDetailsSection,
    registerUnregisterSection,
    administrativeToolsSection,
    hideZeroBalanceSection,
    tokenBarScrollSection,
    changeServerSection,
    addPassphraseSection,
    notificationsBugReportSection,
    reloadWalletSection,
    registerSameNameSection,
    spendSameOutputSection,
    createNftSection,
    resetLockedSection,
    resetMenuSection,
    lateBackupSection,
  ],
};

/**
 * Get all sections
 */
export function getSections(): SectionConfig[] {
  return desktopQAConfig.sections;
}

/**
 * Get a section by ID
 */
export function getSection(sectionId: string): SectionConfig | undefined {
  return desktopQAConfig.sections.find((s) => s.id === sectionId);
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
  return desktopQAConfig.sections.reduce((total, section) => total + section.steps.length, 0);
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
  const sections = desktopQAConfig.sections;
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
  const sections = desktopQAConfig.sections;
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
