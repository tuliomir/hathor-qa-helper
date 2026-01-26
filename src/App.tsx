import { Route, Routes } from 'react-router-dom';
import QALayout from './components/QALayout';
import MobileQALayout from './components/mobile/MobileQALayout';
import DesktopQALayout from './components/desktop/DesktopQALayout';
import WalletAutoLoader from './components/common/WalletAutoLoader';
import './App.css';

function App() {
  return (
    <>
      {/* Auto-start selected wallets on any route */}
      <WalletAutoLoader />

      <Routes>
        <Route path="/" element={<QALayout />} />
        <Route path="/mobile/*" element={<MobileQALayout />} />
        <Route path="/desktop/*" element={<DesktopQALayout />} />
      </Routes>
    </>
  );
}

export default App;
