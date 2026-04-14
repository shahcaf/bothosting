import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    if (token) {
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    } else {
      navigate('/login');
    }
  }, [navigate, location]);

  return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h2>Authenticating with Discord...</h2>
      <p style={{ color: 'var(--text-muted)' }}>You will be redirected shortly.</p>
    </div>
  );
};

export default AuthCallback;
