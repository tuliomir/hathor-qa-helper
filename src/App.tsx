import { Routes, Route } from 'react-router-dom';
import QALayout from './components/QALayout';
import MobileQALayout from './components/mobile/MobileQALayout';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<QALayout />} />
      <Route path="/mobile/*" element={<MobileQALayout />} />
    </Routes>
  );
}

export default App;
