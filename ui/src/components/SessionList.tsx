import React from 'react';
import { TempoSession } from '@tempo/contracts';

interface SessionListProps {
    sessions: TempoSession[];
}

export const SessionList: React.FC<SessionListProps> = ({ sessions }) => {
    return (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                        <th style={thStyle}>Project / App</th>
                        <th style={thStyle}>Duration</th>
                        <th style={thStyle}>Last Active</th>
                        <th style={thStyle}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={tdStyle}>
                                <strong>{s.context.project_path ? pathBasename(s.context.project_path) : (s.context.app_name || 'Unknown')}</strong>
                                {s.context.file_path && <div style={{ fontSize: '0.8em', color: '#666' }}>{pathBasename(s.context.file_path)}</div>}
                            </td>
                            <td style={tdStyle}>{Math.floor(s.duration_seconds / 60)}m {s.duration_seconds % 60}s</td>
                            <td style={tdStyle}>{new Date(s.last_active_time).toLocaleTimeString()}</td>
                            <td style={tdStyle}>
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
                    {sessions.length === 0 && (
                        <tr>
                            <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No sessions found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const thStyle: React.CSSProperties = {
    padding: '16px',
    fontSize: '0.9em',
    color: '#555',
    fontWeight: 600
};

const tdStyle: React.CSSProperties = {
    padding: '16px',
    fontSize: '0.95em',
    color: '#333'
};

function pathBasename(p: string) {
    return p.split(/[\\/]/).pop() || p;
}
