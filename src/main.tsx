import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { store } from './store';
import { initializeWalletConnect } from './store/slices/walletConnectSlice';
import { walletInstancesMap } from './store/slices/walletStoreSlice';

// Initialize WalletConnect on app load
store.dispatch(initializeWalletConnect());

// Expose wallet instances globally for DevTools debugging
// Usage in console: fundingWallet.getTokens(), testWallet.getAddressAtIndex(0), etc.
Object.defineProperty(window, 'fundingWallet', {
  get: () => {
    const state = store.getState();
    const fundingWalletId = state.walletSelection.fundingWalletId;
    if (!fundingWalletId) {
      console.warn('No funding wallet selected');
      return null;
    }
    return walletInstancesMap.get(fundingWalletId) ?? null;
  },
  configurable: true,
});

Object.defineProperty(window, 'testWallet', {
  get: () => {
    const state = store.getState();
    const testWalletId = state.walletSelection.testWalletId;
    if (!testWalletId) {
      console.warn('No test wallet selected');
      return null;
    }
    return walletInstancesMap.get(testWalletId) ?? null;
  },
  configurable: true,
});

// Also expose direct access to the instances map and store for advanced debugging
Object.defineProperty(window, 'walletDev', {
  value: {
    walletInstancesMap,
    store,
    getWallet: (id: string) => walletInstancesMap.get(id),
    listWallets: () => {
      const state = store.getState();
      return Object.entries(state.walletStore.wallets).map(([id, info]) => ({
        id,
        name: info.metadata.friendlyName,
        status: info.status,
        hasInstance: walletInstancesMap.has(id),
      }));
    },
  },
  configurable: true,
});

// Log available debugging globals with styled console output
console.log(
  `%c QA Helper DevTools Ready %c

%cAvailable globals:%c
  %cfundingWallet%c  → Selected funding wallet instance
  %ctestWallet%c     → Selected test wallet instance

%cAdvanced:%c
  %cwalletDev.listWallets()%c    → List all wallets
  %cwalletDev.getWallet(id)%c    → Get wallet by ID
  %cwalletDev.store%c            → Redux store
  %cwalletDev.walletInstancesMap%c → Raw instances map

%cExamples:%c
  await testWallet.getTokens()
  await fundingWallet.getAddressAtIndex(0)
  await testWallet.getBalance('00')
`,
  // Title style
  'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; padding: 8px 16px; border-radius: 4px; font-size: 14px;',
  '', // Reset after title
  // "Available globals:" label
  'color: #10b981; font-weight: bold; font-size: 12px;',
  '',
  // fundingWallet
  'color: #f59e0b; font-weight: bold; font-family: monospace;',
  'color: #6b7280;',
  // testWallet
  'color: #f59e0b; font-weight: bold; font-family: monospace;',
  'color: #6b7280;',
  // "Advanced:" label
  'color: #8b5cf6; font-weight: bold; font-size: 12px;',
  '',
  // walletDev.listWallets()
  'color: #3b82f6; font-family: monospace;',
  'color: #6b7280;',
  // walletDev.getWallet(id)
  'color: #3b82f6; font-family: monospace;',
  'color: #6b7280;',
  // walletDev.store
  'color: #3b82f6; font-family: monospace;',
  'color: #6b7280;',
  // walletDev.walletInstancesMap
  'color: #3b82f6; font-family: monospace;',
  'color: #6b7280;',
  // "Examples:" label
  'color: #ec4899; font-weight: bold; font-size: 12px;',
  'color: #9ca3af; font-family: monospace; font-size: 11px;'
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
