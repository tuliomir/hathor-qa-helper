import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { recordDebugRoute } from './services/debugLog';
import QALayout from './components/QALayout';
import MobileQALayout from './components/mobile/MobileQALayout';
import DesktopQALayout from './components/desktop/DesktopQALayout';
import WalletAutoLoader from './components/common/WalletAutoLoader';
import SignerSync from './components/common/SignerSync';
import { DEFAULT_STAGE_URL } from './config/stageRoutes';

function App() {
  const { pathname, search } = useLocation();
  useEffect(() => recordDebugRoute(pathname + search), [pathname, search]);
  return (
    <>
      {/* Auto-start selected wallets on any route */}
      <WalletAutoLoader />
      {/* Shielded-network wallets get a signer on the QA server */}
      <SignerSync />

      <Routes>
        <Route path="/" element={<Navigate to={DEFAULT_STAGE_URL} replace />} />
        <Route path="/tools/:groupSlug/:stageSlug" element={<QALayout />} />

        {/* Mobile and Desktop stay at root — their own URL structure comes later */}
        <Route path="/mobile/*" element={<MobileQALayout />} />
        <Route path="/desktop/*" element={<DesktopQALayout />} />

        {/* Catch-all fallbacks */}
        <Route path="/tools" element={<Navigate to={DEFAULT_STAGE_URL} replace />} />
        <Route path="/tools/*" element={<Navigate to={DEFAULT_STAGE_URL} replace />} />
      </Routes>
    </>
  );
}

export default App;
