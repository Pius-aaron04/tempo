import React, { useEffect, useState } from 'react';
import { TempoSession } from '@tempo/contracts';

declare global {
  interface Window {
    tempo?: {
      request: (req: any) => Promise<any>;
    };
  }
}

function App() {
  const [sessions, setSessions] = useState<TempoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    // Check if running in Electron with the agent bridge
    if (!window.tempo) {
      setError('Agent connection unavailable. Please run this app in Electron, not a web browser.');
      setLoading(false);
      return;
    }

    try {
      const res = await window.tempo.request({ type: 'query_sessions', limit: 20 });
      if (res.success) {
        setSessions(res.data);
        setError(null);
      } else {
        setError(res.error || 'Unknown error');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Tempo Dashboard</h1>
      
      {error && (
        <div style={{ 
          color: '#721c24', 
          backgroundColor: '#f8d7da', 
          borderColor: '#f5c6cb', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Status:</strong> {error}
        </div>
      )}
      
      {loading ? (
        <p>Loading sessions...</p>
      ) : (
        sessions.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Project / App</th>
                <th style={{ padding: '10px' }}>Duration</th>
                <th style={{ padding: '10px' }}>Last Active</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>
                    <strong>{s.context.project_path || s.context.app_name || 'Unknown'}</strong>
                    {s.context.file_path && <div style={{ fontSize: '0.8em', color: '#666' }}>{s.context.file_path}</div>}
                  </td>
                  <td style={{ padding: '10px' }}>{Math.floor(s.duration_seconds / 60)}m {s.duration_seconds % 60}s</td>
                  <td style={{ padding: '10px' }}>{new Date(s.last_active_time).toLocaleTimeString()}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.8em',
                      background: s.status === 'active' ? '#e6f4ea' : '#f1f3f4',
                      color: s.status === 'active' ? '#1e8e3e' : '#5f6368'
                    }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !error && <p>No recent sessions found.</p>
        )
      )}
    </div>
  );
}

export default App;