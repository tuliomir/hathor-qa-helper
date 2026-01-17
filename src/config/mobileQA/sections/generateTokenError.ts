/**
 * Generate Token Error Section Configuration
 * Tests creating token without sufficient funds
 * Includes CreateTokenStage embedded tool
 */

import type { SectionConfig } from '../../../types/mobileQA';

export const generateTokenErrorSection: SectionConfig = {
  id: 'generate-token-error',
  title: 'Generate Token Error',
  description: 'Create a Token without funds',
  steps: [
    {
      id: 'step-1',
      title: 'Go to Settings',
      instructions: 'Go to **Settings** and Create a new Token.',
      tool: {
        componentKey: 'CreateTokenStage',
      },
    },
    {
      id: 'step-2',
      title: 'Enter token name',
      instructions: 'Enter token name **Test Token**, and click **Next**.',
      tool: {
        componentKey: 'CreateTokenStage',
      },
    },
    {
      id: 'step-3',
      title: 'Enter token symbol',
      instructions: 'Enter token symbol **TEST**, and click **Next**.',
      tool: {
        componentKey: 'CreateTokenStage',
      },
    },
    {
      id: 'step-4',
      title: 'Enter amount',
      instructions: 'Enter the amount of **100**.',
      tool: {
        componentKey: 'CreateTokenStage',
      },
    },
    {
      id: 'step-5',
      title: 'Verify error state',
      instructions:
        'The **Next** button should not be clickable. Also, deposit value and balance should turn **red**.',
      tool: {
        componentKey: 'CreateTokenStage',
      },
    },
  ],
};
