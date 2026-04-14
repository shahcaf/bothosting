import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
  const [bots, setBots] = useState([]);
  const [newBotName, setNewBotName] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [botToken, setBotToken] = useState('');
  const [clientId, setClientId] = useState('');

  const fetchBots = async () => {
    try {
      const res = await api.get('/bots');
      setBots(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const createBot = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bots/create', { name: newBotName, githubRepo, bot_token: botToken, clientId });
      setNewBotName('');
      setGithubRepo('');
      setBotToken('');
      setClientId('');
      fetchBots();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Create New Bot</h2>
        <form onSubmit={createBot} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
              <label>Bot Name</label>
              <input 
                type="text" 
                value={newBotName} 
                onChange={(e) => setNewBotName(e.target.value)} 
                placeholder="My Awesome Bot"
                required 
              />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '250px' }}>
              <label>GitHub Repository URL</label>
              <input 
                type="url" 
                value={githubRepo} 
                onChange={(e) => setGithubRepo(e.target.value)} 
                placeholder="https://github.com/username/repo"
                required 
              />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '250px' }}>
              <label>Discord Client ID</label>
              <input 
                type="text" 
                value={clientId} 
                onChange={(e) => setClientId(e.target.value)} 
                placeholder="1234567890"
                required 
              />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 2, minWidth: '350px' }}>
              <label>Discord Bot Token</label>
              <input 
                type="password" 
                value={botToken} 
                onChange={(e) => setBotToken(e.target.value)} 
                placeholder="MTAy..."
                required 
              />
            </div>
          </div>
          <button type="submit" className="btn btn-success" style={{ padding: '0.85rem 2rem' }}>Deploy Instance</button>
        </form>
      </div>

      <h2>Your Bots ({bots.length})</h2>
      <div className="bot-grid">
        {bots.map((bot) => (
          <div className="bot-card" key={bot.id}>
            <h3>{bot.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>ID: {bot.id.substring(0,8)}...</p>
            <div style={{ margin: '1rem 0' }}>
              <span className={`status-badge ${
                bot.status === 'running' ? 'status-running' : 
                bot.status === 'starting' ? 'status-starting' : 
                'status-stopped'
              }`}>
                {bot.status}
              </span>
            </div>
            <Link to={`/bot/${bot.id}`} className="btn" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Manage Bot
            </Link>
          </div>
        ))}
      </div>
      {bots.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No bots found. Deploy one to get started!</p>}
    </>
  );
};

export default Dashboard;
