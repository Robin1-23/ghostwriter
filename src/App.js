import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import AppShell from './pages/AppShell';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <LoadingScreen />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0c', color: 'rgba(255,255,255,0.3)', fontSize: 13,
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: '#7F77DD',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}></div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.9)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RedirectIfAuth><Landing /></RedirectIfAuth>} />
          <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
