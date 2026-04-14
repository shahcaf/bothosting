import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import BotControl from './components/BotControl';
import Monitor from './components/Monitor';
import Landing from './components/Landing';
import AuthCallback from './components/AuthCallback';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <h1 style={{ margin: 0 }}>BotHost</h1>
            {isAuthenticated && (
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
                <Link to="/monitor" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Monitor</Link>
              </div>
            )}
          </div>
          {isAuthenticated && (
            <button className="btn btn-danger" onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}>Logout</button>
          )}
        </nav>
        <main className="container">
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
            <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/monitor" element={isAuthenticated ? <Monitor /> : <Navigate to="/login" />} />
            <Route path="/bot/:id" element={isAuthenticated ? <BotControl /> : <Navigate to="/login" />} />
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Landing />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
