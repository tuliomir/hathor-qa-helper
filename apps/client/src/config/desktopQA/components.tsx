/**
 * Component Registry for Desktop QA Walkthrough
 * Maps component keys to actual React components
 */

import type { ComponentType } from 'react';
import WalletInitialization from '../../components/stages/WalletInitialization';
import { CreateTokenStage } from '../../components/stages/CreateTokenStage';
import CustomTokens from '../../components/stages/CustomTokens';
import { SendTransactionStage } from '../../components/stages/SendTransactionStage';
import { GetAddressStage } from '../../components/stages/GetAddressStage';
import { GetBalanceStage } from '../../components/stages/GetBalanceStage';
import SeedPhraseCapture from '../../components/stages/SeedPhraseCapture';
import FundTestAddress from '../../components/stages/FundTestAddress';
import AddressListViewer from '../../components/stages/AddressListViewer';
import AddressQRValidator from '../../components/stages/AddressQRValidator';
import TestWalletBalance from '../../components/common/TestWalletBalance';
import DisplayWalletAddress, { TestWalletAddress } from '../../components/common/DisplayWalletAddress';
import TokenConfigValidator, { TokenConfigDisplay } from '../../components/common/TokenConfigValidator';

/**
 * Registry mapping component keys to their implementations
 * All components accept NO props - they're self-contained and read from Redux
 */
export const componentRegistry: Record<string, ComponentType> = {
  WalletInitialization,
  CreateTokenStage,
  CustomTokens,
  SendTransactionStage,
  GetAddressStage,
  GetBalanceStage,
  SeedPhraseCapture,
  FundTestAddress,
  AddressListViewer,
  AddressQRValidator,
  TestWalletBalance,
  FundingWalletAddress: DisplayWalletAddress,
  TestWalletAddress,
  TokenConfigValidator,
  TokenConfigDisplay,
};

/**
 * Get a component by its key from the registry
 * Returns undefined if the component is not found
 */
export function getComponent(componentKey: string): ComponentType | undefined {
  return componentRegistry[componentKey];
}
