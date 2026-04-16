import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import all the original apps
import LoginApp from './apps/login/App';
import AdminApp from './apps/admin/App';
import DirectorApp from './apps/director/App';
import DepartmentApp from './apps/department/App';
import FoetApp from './apps/foet/App';

// Import only essential CSS files
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route - redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Login routes - preserve original login system */}
        <Route path="/login/*" element={<LoginApp />} />
        
        {/* Role-specific routes - each app gets its own space */}
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/director/*" element={<DirectorApp />} />
        <Route path="/department/*" element={<DepartmentApp />} />
        <Route path="/foet/*" element={<FoetApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
