import React, { useEffect, useState } from 'react';
import { Folder, Clock, Activity } from 'lucide-react';

interface ProjectListProps {
    onProjectClick: (path: string) => void;
}

interface ProjectStat {
    key: string;
    total_duration_seconds: number;
    session_count: number;
}

export const ProjectList: React.FC<ProjectListProps> = ({ onProjectClick }) => {
    const [projects, setProjects] = useState<ProjectStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            if (!window.tempo) return;
            try {
                const res = await window.tempo.request({ type: 'query_analytics', groupBy: 'project' });
                if (res.success && res.data) {
                    setProjects(res.data);
                }
            } catch (e) {
                console.error('Failed to fetch projects:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const formatName = (name: string) => name.split(/[\\/]/).pop() || name;

    return (
        <div style={{ padding: '0 20px' }}>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading projects...</div>
            ) : projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No project history found.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {projects.map((proj) => (
                        <div
                            key={proj.key}
                            onClick={() => onProjectClick(proj.key)}
                            style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                border: '1px solid transparent'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
                                e.currentTarget.style.borderColor = '#0088FE';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                e.currentTarget.style.borderColor = 'transparent';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                                <div style={{
                                    background: '#e3f2fd',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    color: '#0088FE'
                                }}>
                                    <Folder size={24} />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1em', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={proj.key}>
                                        {formatName(proj.key)}
                                    </h3>
                                    <div style={{ fontSize: '0.8em', color: '#888', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {proj.key}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555' }}>
                                    <Clock size={16} />
                                    <span style={{ fontWeight: 500 }}>{formatTime(proj.total_duration_seconds)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888' }}>
                                    <Activity size={16} />
                                    <span>{proj.session_count} sessions</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
