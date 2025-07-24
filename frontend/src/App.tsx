import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Funnels from './pages/Funnels';
import Retention from './pages/Retention';
import Events from './pages/Events';
import Users from './pages/Users';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/funnels" element={<Funnels />} />
            <Route path="/retention" element={<Retention />} />
            <Route path="/events" element={<Events />} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App; 