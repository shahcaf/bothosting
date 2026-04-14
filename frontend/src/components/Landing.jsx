import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--accent)' }}>Welcome to BotHost</h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        The ultimate platform to deploy and manage your Discord bots 24/7.
        Highly scalable, Docker-isolated, and built for speed.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.25rem', padding: '0.75rem 2rem' }}>
          Get Started
        </Link>
        <Link to="/login" className="btn btn-secondary" style={{ fontSize: '1.25rem', padding: '0.75rem 2rem' }}>
          Sign In
        </Link>
      </div>

      <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem' }}>
        <div className="card" style={{ flex: '1 1 300px' }}>
          <h3>Docker Isolated</h3>
          <p style={{ color: 'var(--text-muted)' }}>Every bot gets its own perfectly isolated runtime container.</p>
        </div>
        <div className="card" style={{ flex: '1 1 300px' }}>
          <h3>Live Tracking</h3>
          <p style={{ color: 'var(--text-muted)' }}>Stream your bot's console output live directly to your browser.</p>
        </div>
        <div className="card" style={{ flex: '1 1 300px' }}>
          <h3>1-Click Restarts</h3>
          <p style={{ color: 'var(--text-muted)' }}>Turn your discord bots on and off without any command line syntax.</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
