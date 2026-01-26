import { Route, Routes } from 'react-router-dom';
import QALayout from './components/QALayout';
import MobileQALayout from './components/mobile/MobileQALayout';
import DesktopQALayout from './components/desktop/DesktopQALayout';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<QALayout />} />
      <Route path="/mobile/*" element={<MobileQALayout />} />
      <Route path="/desktop/*" element={<DesktopQALayout />} />
    </Routes>
  );
}

export default App;
