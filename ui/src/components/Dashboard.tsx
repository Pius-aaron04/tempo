import React from 'react';
import { TempoSession } from '@tempo/contracts';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
import { Clock, Code, Zap, Calendar } from 'lucide-react';

interface DashboardProps {
    sessions: TempoSession[];
    onProjectClick: (path: string) => void;
}

type TimeRange = 7 | 30 | 365 | -1 | 0;

const AgentControlPanel: React.FC = () => {
    const [status, setStatus] = React.useState<'running' | 'stopped' | 'unknown'>('unknown');
    const [loading, setLoading] = React.useState(false);

    const checkStatus = async () => {
        if (!window.tempo?.agentControl) return;
        try {
            const res = await window.tempo.agentControl('status');
            if (res) setStatus(res.running ? 'running' : 'stopped');
        } catch (e) {
            console.error('Agent control error:', e);
            setStatus('unknown');
        }
    };

    React.useEffect(() => {
        const init = async () => {
             // Only show in packaged app
             try {
                 const info = await window.tempo.getAppInfo?.();
                 if (info && !info.isPackaged) {
                     // In dev mode, we hide this control
                     setStatus('hidden' as any); 
                     return;
                 }
             } catch (e) {
                 // ignore, assume packaged or old context
             }

            checkStatus();
            const timer = setInterval(checkStatus, 5000);
            return () => clearInterval(timer);
        }
        init();
    }, []);

    const toggleAgent = async () => {
        setLoading(true);
        const action = status === 'running' ? 'stop' : 'start';
        try {
            await window.tempo.agentControl(action);
            // Wait a bit for startup
            setTimeout(checkStatus, 1000);
        } catch (e) {
            console.error('Failed to toggle agent:', e);
        }
        setLoading(false);
    };

    if (status === 'unknown' || status === ('hidden' as any)) return null;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 8px', background: '#f5f5f5', borderRadius: '6px', fontSize: '0.85em'
        }}>
            <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: status === 'running' ? '#4caf50' : '#f44336'
            }} />
            <span style={{ color: '#555' }}>
                {status === 'running' ? 'Agent Active' : 'Agent Stopped'}
            </span>
            <button
                onClick={toggleAgent}
                disabled={loading}
                style={{
                    border: '1px solid #ddd', background: 'white', cursor: 'pointer',
                    padding: '2px 6px', borderRadius: '4px', fontSize: '0.9em', marginLeft: '5px'
                }}
            >
                {loading ? '...' : (status === 'running' ? 'Stop' : 'Start')}
            </button>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ sessions, onProjectClick }) => {
    const [timeRange, setTimeRange] = React.useState<TimeRange>(0); // Default to Today
    const [trendData, setTrendData] = React.useState<any[]>([]);
    const [activityTrendData, setActivityTrendData] = React.useState<any[]>([]);
    const [appTrendData, setAppTrendData] = React.useState<any[]>([]); // New: App Trends
    const [workPatternData, setWorkPatternData] = React.useState<any[]>([]);
    const [todaySessions, setTodaySessions] = React.useState<TempoSession[]>([]);
    const [langData, setLangData] = React.useState<any[]>([]);
    const [appData, setAppData] = React.useState<any[]>([]); // New: App Pie Data
    const [totalDuration, setTotalDuration] = React.useState(0);
    const [topProject, setTopProject] = React.useState({ name: '-', value: 0 });
    const [topLang, setTopLang] = React.useState({ name: '-', value: 0 });

    React.useEffect(() => {
        const fetchData = async () => {
            if (!window.tempo) return;

            try {
                // 1. Trend Data (Based on Time Range)
                const trends = await window.tempo.request({ type: 'query_trend', groupBy: 'project', days: timeRange });
                if (trends.success) setTrendData(trends.data);

                const activityTrends = await window.tempo.request({ type: 'query_trend', groupBy: 'language', days: timeRange });
                if (activityTrends.success) setActivityTrendData(activityTrends.data);

                const appTrends = await window.tempo.request({ type: 'query_trend', groupBy: 'app', days: timeRange });
                if (appTrends.success) setAppTrendData(appTrends.data);

                const workPattern = await window.tempo.request({ type: 'query_work_pattern', days: timeRange });
                if (workPattern.success) setWorkPatternData(workPattern.data);

                // 2. Calculate Totals
                let total = 0;
                const projAgg: Record<string, number> = {};
                const langAgg: Record<string, number> = {};
                const appAgg: Record<string, number> = {};

                (trends.data || []).forEach((day: any) => {
                    Object.entries(day).forEach(([key, val]) => {
                        if (key !== 'date') {
                            const duration = val as number;
                            total += duration;
                            projAgg[key] = (projAgg[key] || 0) + duration;
                        }
                    });
                });

                (activityTrends.data || []).forEach((day: any) => {
                    Object.entries(day).forEach(([key, val]) => {
                        if (key !== 'date') {
                            langAgg[key] = (langAgg[key] || 0) + (val as number);
                        }
                    });
                });

                (appTrends.data || []).forEach((day: any) => {
                    Object.entries(day).forEach(([key, val]) => {
                        if (key !== 'date') {
                            appAgg[key] = (appAgg[key] || 0) + (val as number);
                        }
                    });
                });

                setTotalDuration(total);

                const sortedProjs = Object.entries(projAgg).sort((a, b) => b[1] - a[1]);
                if (sortedProjs.length > 0) setTopProject({ name: sortedProjs[0][0], value: sortedProjs[0][1] });
                else setTopProject({ name: '-', value: 0 });

                const sortedLangs = Object.entries(langAgg).sort((a, b) => b[1] - a[1]);
                if (sortedLangs.length > 0) setTopLang({ name: sortedLangs[0][0], value: sortedLangs[0][1] });
                else setTopLang({ name: '-', value: 0 });

                // Prepare Pie Data
                setLangData(sortedLangs.map(([name, value]) => ({ name, value })));

                const sortedApps = Object.entries(appAgg).sort((a, b) => b[1] - a[1]);
                setAppData(sortedApps.map(([name, value]) => ({ name, value })));

                // 3. Today's Sessions (Always fetch specifically for today view)
                const today = new Date().toISOString().split('T')[0];
                const sessionsRes = await window.tempo.request({ type: 'query_sessions', limit: 100, startTime: today + 'T00:00:00.000Z' });
                if (sessionsRes.success) {
                    setTodaySessions(sessionsRes.data);
                }

            } catch (e) {
                console.error('Dashboard fetch error:', e);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [timeRange]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#a4de6c'];

    // Deterministic color generator for consistency
    const getColor = (key: string) => {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = key.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % COLORS.length;
        return COLORS[index];
    };

    // Collect all unique keys for stacked bars
    const getKeys = (data: any[]) => {
        const keys = new Set<string>();
        data.forEach(item => Object.keys(item).forEach(k => {
            if (k !== 'date') keys.add(k);
        }));
        return Array.from(keys);
    };

    const projectKeys = getKeys(trendData);
    const activityKeys = getKeys(activityTrendData);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // Extract basename for project display
    const formatName = (name: string) => name.split(/[\\/]/).pop() || name;

    const useLineChart = timeRange === -1 || timeRange > 30;
    const isToday = timeRange === 0;

    // Custom Tooltip Component
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Calculate total for this hover state
            const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

            return (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    border: '1px solid #ccc',
                    padding: '10px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    fontSize: '0.9em'
                }}>
                    <p style={{ margin: '0 0 5px', fontWeight: 'bold', color: '#333' }}>{label}</p>
                    <p style={{ margin: '0 0 8px', fontWeight: '600', color: '#111', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                        Total: {formatTime(total)}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ margin: '2px 0', color: entry.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></span>
                            <span>{entry.name}:</span>
                            <span style={{ fontWeight: 500 }}>{formatTime(entry.value)}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header / Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#555' }}>
                    {timeRange === -1 ? 'All Time Overview' : (timeRange === 0 ? 'Today\'s Overview' : `Last ${timeRange} Days Overview`)}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AgentControlPanel />
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

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={cardStyle}>
                    <div style={iconContainerStyle}><Clock size={24} color="#0088FE" /></div>
                    <div>
                        <div style={labelStyle}>Total Time</div>
                        <div style={valueStyle}>{formatTime(totalDuration)}</div>
                    </div>
                </div>
                <div style={cardStyle}>
                    <div style={iconContainerStyle}><Code size={24} color="#00C49F" /></div>
                    <div>
                        <div style={labelStyle}>Top Language</div>
                        <div style={valueStyle}>{formatName(topLang.name)}</div>
                        <div style={{ fontSize: '0.8em', color: '#999' }}>{formatTime(topLang.value)}</div>
                    </div>
                </div>
                <div style={cardStyle}>
                    <div style={iconContainerStyle}><Zap size={24} color="#FFBB28" /></div>
                    <div>
                        <div style={labelStyle}>Top Project</div>
                        <div style={valueStyle}>{formatName(topProject.name)}</div>
                        <div style={{ fontSize: '0.8em', color: '#999' }}>{formatTime(topProject.value)}</div>
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>

                {/* Projects Trend */}
                <div style={chartCardStyle}>
                    <h3 style={chartTitleStyle}>{isToday ? 'Activity by Hour' : 'Time by Project'}</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {useLineChart ? (
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={12} tick={{ fill: '#666' }} minTickGap={30} />
                                    <YAxis fontSize={12} tickFormatter={(val) => `${Math.floor(val / 60)}m`} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    {projectKeys.map((key, index) => (
                                        <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} name={formatName(key)} dot={false} strokeWidth={2} />
                                    ))}
                                </LineChart>
                            ) : (
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={12} />
                                    <YAxis fontSize={12} tickFormatter={(val) => `${Math.floor(val / 60)}m`} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Legend />
                                    {projectKeys.map((key, index) => (
                                        <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} name={formatName(key)} />
                                    ))}
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Activity Trend -> Time by language */}
                <div style={chartCardStyle}>
                    <h3 style={chartTitleStyle}>Time by Language</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {useLineChart ? (
                                <LineChart data={activityTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={12} tick={{ fill: '#666' }} minTickGap={30} />
                                    <YAxis fontSize={12} tickFormatter={(val) => `${Math.floor(val / 60)}m`} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    {activityKeys.map((key) => (
                                        <Line key={key} type="monotone" dataKey={key} stroke={getColor(key)} name={formatName(key)} dot={false} strokeWidth={2} />
                                    ))}
                                </LineChart>
                            ) : (
                                <BarChart data={activityTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={12} />
                                    <YAxis fontSize={12} tickFormatter={(val) => `${Math.floor(val / 60)}m`} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Legend />
                                    {activityKeys.map((key) => (
                                        <Bar key={key} dataKey={key} stackId="a" fill={getColor(key)} name={formatName(key)} />
                                    ))}
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Language Mix */}
                <div style={chartCardStyle}>
                    <h3 style={chartTitleStyle}>Languages Distribution</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={langData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {langData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(val: number | undefined) => formatTime(val || 0)} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Editors Mix */}
                <div style={chartCardStyle}>
                    <h3 style={chartTitleStyle}>Editors Distribution</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={appData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {appData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(val: number | undefined) => formatTime(val || 0)} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Work Pattern (Reading vs Writing) */}
                <div style={chartCardStyle}>
                    <h3 style={chartTitleStyle}>Work Pattern (Reading vs Writing)</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {useLineChart ? (
                                <LineChart data={workPatternData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={12} tick={{ fill: '#666' }} minTickGap={30} />
                                    <YAxis fontSize={12} tickFormatter={(val) => `${Math.floor(val / 60)}m`} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line dataKey="writing_seconds" name="Writing" stroke="#FF8042" dot={false} strokeWidth={2} />
                                    <Line dataKey="reading_seconds" name="Reading" stroke="#00C49F" dot={false} strokeWidth={2} />
                                </LineChart>
                            ) : (
                                <BarChart data={workPatternData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={12} />
                                    <YAxis fontSize={12} tickFormatter={(val) => `${Math.floor(val / 60)}m`} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Legend />
                                    <Bar dataKey="writing_seconds" name="Writing" stackId="a" fill="#FF8042" />
                                    <Bar dataKey="reading_seconds" name="Reading" stackId="a" fill="#00C49F" />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Projects List */}
                <div style={chartCardStyle}>
                    <h3 style={chartTitleStyle}>Active Projects</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {Object.entries(trendData.reduce((acc: any, day: any) => {
                            Object.keys(day).forEach(k => {
                                if (k !== 'date') acc[k] = (acc[k] || 0) + day[k];
                            });
                            return acc;
                        }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 12).map(([name, duration]: any) => (
                            <div
                                key={name}
                                onClick={() => onProjectClick(name)}
                                style={{
                                    padding: '15px',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = '#0088FE';
                                    e.currentTarget.style.background = '#fefefe';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = '#eee';
                                    e.currentTarget.style.background = 'white';
                                }}
                            >
                                <div style={{ fontWeight: 500, color: '#333' }}>{formatName(name)}</div>
                                <div style={{ color: '#666', fontSize: '0.9em' }}>{formatTime(duration)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editors List */}
                <div style={chartCardStyle}>
                    <h3 style={chartTitleStyle}>Active Editors</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {appData.slice(0, 12).map(({ name, value }) => (
                            <div
                                key={name}
                                style={{
                                    padding: '15px',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ fontWeight: 500, color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: getColor(name) }}></div>
                                    {formatName(name)}
                                </div>
                                <div style={{ color: '#666', fontSize: '0.9em' }}>{formatTime(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Daily Activities List */}
            <div style={chartCardStyle}>
                <h3 style={chartTitleStyle}>Activities for Today (Recent)</h3>
                {todaySessions.length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No activity today yet.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Time Range</th>
                                <th style={{ padding: '8px' }}>Project/App</th>
                                <th style={{ padding: '8px' }}>Duration</th>
                                <th style={{ padding: '8px' }}>Sessions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupSessions(todaySessions).map(group => (
                                <tr key={group.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '8px' }}>
                                        {new Date(group.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {' - '}
                                        {new Date(group.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ fontWeight: 500 }}>{group.key}</div>
                                        <div style={{ fontSize: '0.8em', color: '#888' }}>
                                            {/* Show up to 3 unique files/details as context */}
                                            {Array.from(new Set(group.sessions.map(s => s.context.file_path ? formatName(s.context.file_path) : '').filter(Boolean))).slice(0, 3).join(', ')}
                                            {group.sessions.length > 3 && '...'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px', fontWeight: 500 }}>{formatTime(group.totalDuration)}</td>
                                    <td style={{ padding: '8px', color: '#888' }}>{group.sessions.length}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// Helper for Semantic Grouping
function groupSessions(sessions: TempoSession[]) {
    if (sessions.length === 0) return [];

    // Sort ascending for grouping
    const sorted = [...sessions].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const GAP_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

    interface ActivityBlock {
        id: string;
        key: string;
        startTime: string;
        endTime: string;
        totalDuration: number;
        sessions: TempoSession[];
    }

    const groups: ActivityBlock[] = [];
    let current: ActivityBlock | null = null;

    const getName = (s: TempoSession) => s.context.project_path
        ? s.context.project_path.split(/[\\/]/).pop() || 'Unknown'
        : (s.context.app_name || 'Apps');

    const isGeneric = (n: string) => n === 'VS Code' || n === 'Cursor' || n === 'Editor' || n === 'Apps';

    for (const s of sorted) {
        const name = getName(s);
        const sStart = new Date(s.start_time).getTime();

        if (!current) {
            current = {
                id: s.id || Math.random().toString(),
                key: name,
                startTime: s.start_time,
                endTime: s.last_active_time,
                totalDuration: s.duration_seconds,
                sessions: [s]
            };
            continue;
        }

        const groupEnd = new Date(current.endTime).getTime();
        const gap = sStart - groupEnd;

        // Logic for merging:
        // 1. Must be within time gap
        // 2. AND (Keys match OR one is generic and we assume it belongs to the active context)

        const strictMatch = current.key === name;
        const upgradeMatch = isGeneric(current.key) && !isGeneric(name); // Current is "VS Code", New is "Project A" -> Merge & Upgrade
        const absorbMatch = !isGeneric(current.key) && isGeneric(name);  // Current is "Project A", New is "VS Code" -> Merge

        if (gap <= GAP_THRESHOLD_MS && (strictMatch || upgradeMatch || absorbMatch)) {
            // Update end time
            current.endTime = s.last_active_time;
            current.totalDuration += s.duration_seconds;
            current.sessions.push(s);

            // If we are upgrading from a generic key to a specific one
            if (upgradeMatch) {
                current.key = name;
            }
        } else {
            groups.push(current);
            current = {
                id: s.id || Math.random().toString(),
                key: name,
                startTime: s.start_time,
                endTime: s.last_active_time,
                totalDuration: s.duration_seconds,
                sessions: [s]
            };
        }
    }

    if (current) groups.push(current);

    return groups.reverse(); // Show newest first
}

const cardStyle: React.CSSProperties = {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
};

const iconContainerStyle: React.CSSProperties = {
    background: '#f5f7fa',
    padding: '12px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.9em',
    color: '#666',
    marginBottom: '4px'
};

const valueStyle: React.CSSProperties = {
    fontSize: '1.4em',
    fontWeight: 'bold',
    color: '#333'
};

const chartCardStyle: React.CSSProperties = {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};

const chartTitleStyle: React.CSSProperties = {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '1.1em',
    color: '#333'
};
