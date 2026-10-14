import { Navigate, Route, Routes } from 'react-router-dom';
import QALayout from './components/QALayout';
import MobileQALayout from './components/mobile/MobileQALayout';
import DesktopQALayout from './components/desktop/DesktopQALayout';
import WalletAutoLoader from './components/common/WalletAutoLoader';
import { DEFAULT_STAGE_URL } from './config/stageRoutes';
import NetworkRail from './components/shell/NetworkRail';

function App() {
  return (
    <>
      {/* Auto-start selected wallets on any route */}
      <WalletAutoLoader />

      {/* Interim placement until AppShell owns the rail */}
      <div className="fixed inset-x-0 top-0 z-50">
        <NetworkRail />
      </div>

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
