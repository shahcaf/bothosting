import React, { useState, useEffect } from 'react';
import api from '../api';

const FileManager = ({ botId }) => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchFiles = async () => {
    try {
      const res = await api.get(`/files/list/${botId}`);
      setFiles(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [botId]);

  const handleFileClick = async (filePath) => {
    setMessage('');
    try {
      const res = await api.get(`/files/read/${botId}?filePath=${encodeURIComponent(filePath)}`);
      setSelectedFile(filePath);
      setContent(res.data.content);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.post(`/files/save/${botId}`, { filePath: selectedFile, content });
      setMessage('File saved successfully!');
      setSaving(false);
    } catch (err) {
      console.error(err);
      setMessage('Failed to save file.');
      setSaving(false);
    }
  };

  const renderTree = (nodes) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ marginLeft: node.type === 'dir' ? '0' : '1.5rem' }}>
        {node.type === 'dir' ? (
          <details open>
            <summary style={{ cursor: 'pointer', padding: '0.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
              📁 {node.name}
            </summary>
            <div style={{ marginLeft: '1rem', borderLeft: '1px solid #1e293b' }}>
              {renderTree(node.children)}
            </div>
          </details>
        ) : (
          <div 
            onClick={() => handleFileClick(node.path)} 
            style={{ 
              cursor: 'pointer', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '0.2rem',
              backgroundColor: selectedFile === node.path ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: selectedFile === node.path ? 'var(--accent)' : 'inherit'
            }}
          >
            📄 {node.name}
          </div>
        )}
      </div>
    ));
  };

  if (loading) return <p>Loading files...</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', height: '600px', marginTop: '1rem' }}>
      <div className="card" style={{ overflowY: 'auto', padding: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Project Explorer</h3>
        {renderTree(files)}
      </div>
      
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {selectedFile ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Editing: <span style={{ color: 'var(--accent)' }}>{selectedFile}</span></h3>
              {message && <span style={{ color: message.includes('success') ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>{message}</span>}
              <button onClick={handleSave} className="btn btn-success" disabled={saving}>
                {saving ? 'Saving...' : 'Save File'}
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
                fontFamily: 'monospace',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #1e293b',
                resize: 'none'
              }}
            />
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Select a file from the explorer to start editing.
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManager;
