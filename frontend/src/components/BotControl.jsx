import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';
import FileManager from './FileManager';

const BotControl = () => {
  const { id } = useParams();
  const [bot, setBot] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('console'); // console or files
  const logsEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBot();
    const socket = io('http://localhost:5000');
    socket.emit('join-log-room', id);
    
    socket.on('bot-log', (data) => {
      setLogs((prev) => [...prev.slice(-100), `[${new Date(data.timestamp).toLocaleTimeString()}] ${data.message.trim()}`]);
    });

    return () => socket.disconnect();
  }, [id]);

  useEffect(() => {
    let interval;
    if (bot?.status === 'starting') {
      interval = setInterval(fetchBot, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [bot?.status]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchBot = async () => {
    try {
      const res = await api.get(`/bots/${id}`);
      setBot(prev => {
         if (JSON.stringify(prev) === JSON.stringify(res.data)) return prev;
         return res.data;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (action) => {
    try {
      await api.post(`/bots/action`, { botId: id, action }); // start, stop, restart
      fetchBot();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to completely delete your bot instance? This cannot be undone!")) {
      try {
        await api.post(`/bots/action`, { botId: id, action: 'delete' });
        navigate('/dashboard');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!bot) return <p>Loading bot...</p>;

  return (
    <div>
      <Link to="/dashboard" className="btn btn-secondary" style={{ marginBottom: '1rem', display: 'inline-block' }}>
        Back to Dashboard
      </Link>
      
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{bot.name}</h2>
          <span className={`status-badge ${
            bot.status === 'running' ? 'status-running' : 
            bot.status === 'starting' ? 'status-starting' : 
            'status-stopped'
          }`}>
            {bot.status}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>Bot ID: {bot.id}</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button onClick={() => handleAction('start')} className="btn btn-success" disabled={bot.status === 'running' || bot.status === 'starting'}>
            Start
          </button>
          <button onClick={() => handleAction('restart')} className="btn btn-primary" disabled={bot.status === 'starting'}>
            Restart
          </button>
          <button onClick={() => handleAction('stop')} className="btn btn-danger" disabled={bot.status === 'stopped' || bot.status === 'starting'}>
            Stop
          </button>

          <button onClick={handleDelete} className="btn btn-secondary" style={{ marginLeft: 'auto', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
            Delete Bot
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button 
          onClick={() => setActiveTab('console')} 
          className={`btn ${activeTab === 'console' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}
        >
          Console
        </button>
        <button 
          onClick={() => setActiveTab('files')} 
          className={`btn ${activeTab === 'files' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}
        >
          File Manager
        </button>
      </div>

      {activeTab === 'console' ? (
        <div className="card" style={{ marginTop: 0, borderRadius: '0 0.5rem 0.5rem 0.5rem' }}>
          <h3>Console Logs</h3>
          <div 
            style={{ 
              backgroundColor: '#0a0a0a', 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              fontFamily: 'monospace', 
              height: '400px', 
              overflowY: 'auto',
              color: '#00ff00'
            }}
          >
            {logs.length === 0 ? <p style={{ color: '#555' }}>Waiting for output...</p> : logs.map((log, i) => (
              <div key={i} style={{ whiteSpace: 'pre-wrap', marginBottom: '4px' }}>{log}</div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      ) : (
        <FileManager botId={id} />
      )}
    </div>
  );
};

export default BotControl;
