import React, { useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

import DirectorPortal from './director-portal/DirectorPortal';
import { AppProvider } from './context/AppContext.js';

function App() {
  const [activeTab] = useState('director-portal');

  return (
    <AppProvider>
      <div style={{ display: 'flex' }}>
        <main style={{ flexGrow: 1, marginLeft: 0, padding: 0 }}>
          <DirectorPortal />
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </AppProvider>
  );
}

export default App;
