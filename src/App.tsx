import { Navigate, Route, Routes } from 'react-router-dom';
import QALayout from './components/QALayout';
import MobileQALayout from './components/mobile/MobileQALayout';
import DesktopQALayout from './components/desktop/DesktopQALayout';
import WalletAutoLoader from './components/common/WalletAutoLoader';
import { DEFAULT_STAGE_URL } from './config/stageRoutes';
import './App.css';

function App() {
  return (
    <>
      {/* Auto-start selected wallets on any route */}
      <WalletAutoLoader />

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
