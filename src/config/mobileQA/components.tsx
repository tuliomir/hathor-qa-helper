/**
 * Component Registry for Mobile QA Walkthrough
 * Maps component keys to actual React components
 */

import type { ComponentType } from 'react';
import WalletInitialization from '../../components/stages/WalletInitialization';
import { CreateTokenStage } from '../../components/stages/CreateTokenStage';

/**
 * Registry mapping component keys to their implementations
 * All components accept NO props - they're self-contained and read from Redux
 */
export const componentRegistry: Record<string, ComponentType> = {
  WalletInitialization,
  CreateTokenStage,
};

/**
 * Get a component by its key from the registry
 * Returns undefined if the component is not found
 */
export function getComponent(componentKey: string): ComponentType | undefined {
  return componentRegistry[componentKey];
}
