/**
 * New Token with Empty Wallet Section Configuration
 * Tests token creation when insufficient funds exist
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const tokenEmptyWalletSection: SectionConfig = {
	id: 'token-empty-wallet',
	title: 'New Token with Empty Wallet',
	description: 'Test token creation when insufficient funds exist',
	steps: [
		{
			id: 'step-1',
			title: 'Navigate to Custom tokens',
			instructions: 'Navigate to **Custom tokens** section and select **Create new token**.' +
				'\n\nEnter "Test token" as name, "Test" as symbol, and 100 as amount.' +
				'\n\nVerify that the **1.00 HTR deposit requirement** is displayed.',
		},
		{
			id: 'step-2',
			title: 'Attempt creation',
			instructions:
				'Attempt to create the token and confirm that an **error for insufficient HTR** is displayed.',
		},
	],
};
