import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import './App.css';

// El dashboard arrastra recharts y todas sus vistas. Cargarlo aparte evita que
// el login -la primera pantalla de todos- baje ese peso sin usarlo.
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));

const DashboardFallback = () => (
  <div
    style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#040d21',
    }}
  >
    <div
      style={{
        width: '38px',
        height: '38px',
        border: '3px solid rgba(56, 189, 248, 0.2)',
        borderTopColor: '#38bdf8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<DashboardFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
