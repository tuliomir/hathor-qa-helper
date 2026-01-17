/**
 * New Wallet Section Configuration
 * Includes WalletInitialization embedded tool
 */

import type { SectionConfig } from '../../../types/mobileQA';

export const newWalletSection: SectionConfig = {
  id: 'new-wallet',
  title: 'New Wallet',
  description: 'Create and initialize a new wallet',
  steps: [
    {
      id: 'step-1',
      title: 'Launch app',
      instructions: 'Launch the app for the first time.',
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
    {
      id: 'step-2',
      title: 'Tap New Wallet',
      instructions: "Tap on **'New Wallet'**.",
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
    {
      id: 'step-3',
      title: 'Verify seed words',
      instructions:
        'Verify the seed words screen appears. Note them elsewhere for later use.',
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
    {
      id: 'step-4',
      title: 'Test word confirmation',
      instructions:
        'Confirm one word correctly, miss the second word. Verify error message appears.',
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
    {
      id: 'step-5',
      title: 'Verify navigation back',
      instructions: 'Verify app navigates back to seed words screen.',
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
    {
      id: 'step-6',
      title: 'Confirm all words',
      instructions:
        "Confirm all 5 words correctly and tap **'Next'** to proceed to PIN creation.",
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
    {
      id: 'step-7',
      title: 'Test PIN mismatch',
      instructions: 'Enter a 6-digit PIN and miss the confirmation.',
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
    {
      id: 'step-8',
      title: 'Enter correct PIN',
      instructions: "Re-enter the PIN correctly and press **'Next'**.",
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
    {
      id: 'step-9',
      title: 'Verify initialization',
      instructions: 'Verify wallet initializes successfully.',
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
    {
      id: 'step-10',
      title: 'Confirm Dashboard',
      instructions:
        'Confirm Dashboard screen is displayed - should show only HTR token with **0.00 HTR** balance.',
      tool: {
        componentKey: 'WalletInitialization',
      },
    },
  ],
};
