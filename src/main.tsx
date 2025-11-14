import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { WalletStoreProvider } from './contexts/WalletStoreContext.tsx';
import { StageProvider } from './contexts/StageContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletStoreProvider>
      <StageProvider>
        <App />
      </StageProvider>
    </WalletStoreProvider>
  </StrictMode>
);
