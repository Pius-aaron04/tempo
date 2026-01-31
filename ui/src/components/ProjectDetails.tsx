import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, File, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ProjectDetailsProps {
    projectPath: string;
    onBack: () => void;
}

interface FileStat {
    file_path: string;
    duration_seconds: number;
    last_active: string;
}

type TimeRange = 7 | 30 | 365 | -1 | 0;

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ projectPath, onBack }) => {
    const [files, setFiles] = useState<FileStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalTime, setTotalTime] = useState(0);
    const [timeRange, setTimeRange] = useState<TimeRange>(7);

    const projectName = projectPath.split(/[\\/]/).pop() || projectPath;

    useEffect(() => {
        const fetchData = async () => {
            if (!window.tempo) return;
            setLoading(true);
            try {
                const res = await window.tempo.request({
                    type: 'query_project_files',
                    projectPath,
                    days: timeRange
                });

                if (res.success && res.data) {
                    setFiles(res.data);
                    const total = res.data.reduce((sum: number, f: FileStat) => sum + f.duration_seconds, 0);
                    setTotalTime(total);
                }
            } catch (e) {
                console.error('Failed to fetch project files:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectPath, timeRange]);



    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const formatFileName = (path: string) => path.split(/[\\/]/).pop() || path;

    // Sort by duration descending
    const sortedFiles = [...files].sort((a, b) => b.duration_seconds - a.duration_seconds);
    const topFiles = sortedFiles.slice(0, 15); // Top 15 files for chart

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={onBack} style={{ /* ... styles ... */ }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0, color: '#333' }}>{projectName}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '0.9em', marginTop: '4px' }}>
                            <Clock size={14} />
                            <span>Total: {formatTime(totalTime)}</span>
                        </div>
                    </div>
                </div>

                {/* Time Range Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={16} color="#666" />
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(Number(e.target.value) as TimeRange)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #ddd',
                            fontSize: '0.9em',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value={0}>Today</option>
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={365}>Last 1 Year</option>
                        <option value={-1}>All Time</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading project details...</div>
            ) : (
                <>
                    {/* Chart Section */}
                    {topFiles.length > 0 && (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.1em', color: '#333' }}>Most Active Files</h3>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topFiles} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="file_path" type="category" width={150} tickFormatter={formatFileName} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(val: number | undefined) => [formatTime(val || 0), 'Duration']}
                                            labelFormatter={(label) => formatFileName(String(label))}
                                            cursor={{ fill: 'transparent' }}
                                        />
                                        <Bar dataKey="duration_seconds" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                            {topFiles.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* File List */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flex: 1, overflow: 'auto' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1em', color: '#333' }}>All Files</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left', color: '#888' }}>
                                    <th style={{ padding: '10px 5px', fontWeight: 500 }}>File</th>
                                    <th style={{ padding: '10px 5px', fontWeight: 500 }}>Time</th>
                                    <th style={{ padding: '10px 5px', fontWeight: 500 }}>Last Edited</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedFiles.map((file, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                        <td style={{ padding: '10px 5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <File size={14} color="#999" />
                                            <span title={file.file_path}>{formatFileName(file.file_path)}</span>
                                        </td>
                                        <td style={{ padding: '10px 5px', fontWeight: 500, color: '#444' }}>
                                            {formatTime(file.duration_seconds)}
                                        </td>
                                        <td style={{ padding: '10px 5px', color: '#888' }}>
                                            {new Date(file.last_active).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};
