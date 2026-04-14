import React, { useState, useEffect } from 'react';
import api from '../api';

const Monitor = () => {
  const [bots, setBots] = useState([]);
  const [settings, setSettings] = useState({
    alert_email: '',
    alerts_enabled: true,
    auto_restart: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [botsRes, settingsRes] = await Promise.all([
          api.get('/monitor/status'),
          api.get('/monitor/settings')
        ]);
        setBots(botsRes.data);
        setSettings(settingsRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.post('/monitor/settings', settings);
      setMessage('Settings saved successfully!');
      setSaving(false);
    } catch (err) {
      console.error(err);
      setMessage('Failed to save settings.');
      setSaving(false);
    }
  };

  if (loading) return <p>Loading monitoring data...</p>;

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1>System Monitor</h1>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Alert Settings</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Get notified immediately via email if any of your bots crash or exit unexpectedly.
        </p>
        
        {message && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            backgroundColor: message.includes('success') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: message.includes('success') ? 'var(--success)' : 'var(--danger)',
            marginBottom: '1.5rem'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSaveSettings}>
          <div className="form-group">
            <label>Alert Email Address</label>
            <input 
              type="email" 
              value={settings.alert_email} 
              onChange={(e) => setSettings({...settings, alert_email: e.target.value})} 
              placeholder="alerts@example.com"
              required 
            />
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.alerts_enabled} 
                onChange={(e) => setSettings({...settings, alerts_enabled: e.target.checked})}
                style={{ width: 'auto', margin: 0 }}
              />
              Enable Email Alerts
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: 0.5 }}>
              <input 
                type="checkbox" 
                checked={settings.auto_restart} 
                disabled
                onChange={(e) => setSettings({...settings, auto_restart: e.target.checked})}
                style={{ width: 'auto', margin: 0 }}
              />
              Auto-Restart on Crash (Premium Feature)
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-success" 
            style={{ marginTop: '2rem' }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>

      <h2>Bot Health Overview</h2>
      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
              <th style={{ padding: '1rem' }}>Bot Name</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Uptime Monitoring</th>
              <th style={{ padding: '1rem' }}>Repository</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((bot) => (
              <tr key={bot.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{bot.name}</td>
                <td style={{ padding: '1rem' }}>
                  <span className={`status-badge ${
                    bot.status === 'running' ? 'status-running' : 
                    bot.status === 'starting' ? 'status-starting' : 
                    'status-stopped'
                  }`}>
                    {bot.status}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ color: settings.alerts_enabled ? 'var(--success)' : 'var(--text-muted)' }}>
                    {settings.alerts_enabled ? 'Active 📡' : 'Disabled ⚪'}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {bot.github_repo.replace('https://github.com/', '')}
                </td>
              </tr>
            ))}
            {bots.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No bots found to monitor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Monitor;
