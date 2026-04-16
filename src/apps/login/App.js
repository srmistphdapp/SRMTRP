// src/App.js
import { Routes, Route } from 'react-router-dom';
import React from 'react';
import HomePage from './pages/HomePage/HomePage.js';
import RmpLoginPage from './pages/RmpLoginPage/RmpLoginPage.js';
import TrichyLoginPage from './pages/TrichyLoginPage/TrichyLoginPage.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage.js';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage.js';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="rmp-login" element={<RmpLoginPage />} />
      <Route path="trp-login" element={<TrichyLoginPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
}

export default App;
