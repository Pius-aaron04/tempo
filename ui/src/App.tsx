import React, { useEffect, useState } from 'react';
import { TempoSession } from '@tempo/contracts';
import { Dashboard } from './components/Dashboard';
import { SessionList } from './components/SessionList';
import { ProjectDetails } from './components/ProjectDetails';
import { ProjectList } from './components/ProjectList';
import { Layout, BarChart2, Folder, Settings, ChevronLeft, ChevronRight, Activity, LayoutDashboard, List } from 'lucide-react';

declare global {
  interface Window {
    tempo?: {
      request: (req: any) => Promise<any>;
    };
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions' | 'projects'>('dashboard');
  const [view, setView] = useState<'dashboard' | 'project_details'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TempoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    // Check if running in Electron with the agent bridge
    if (!window.tempo) {
      setError('Agent connection unavailable. Please run this app in Electron methods.');
      setLoading(false);
      return;
    }

    try {
      // Fetch more data for dashboard
      const res = await window.tempo.request({ type: 'query_sessions', limit: 100 });
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

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleProjectClick = (path: string) => {
    setSelectedProject(path);
    setView('project_details');
  };

  const handleBack = () => {
    setView('dashboard');
    setSelectedProject(null);
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8f9fa' }}>
      {/* Sidebar */}
      <div style={{
        width: isCollapsed ? '70px' : '250px',
        background: 'white',
        borderRight: '1px solid #eee',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', paddingLeft: isCollapsed ? '0' : '10px', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <div
            style={{ background: '#333', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Activity size={20} />
          </div>
          {!isCollapsed && <h1 style={{ fontSize: '1.2em', fontWeight: 'bold', margin: 0 }}>Tempo</h1>}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => { setActiveTab('dashboard'); setView('dashboard'); }}
            collapsed={isCollapsed}
          />
          <NavItem
            icon={<List size={20} />}
            label="Sessions"
            active={activeTab === 'sessions'}
            onClick={() => { setActiveTab('sessions'); setView('dashboard'); }}
            collapsed={isCollapsed}
          />
          <NavItem
            icon={<Folder size={20} />}
            label="Projects"
            active={activeTab === 'projects'}
            onClick={() => { setActiveTab('projects'); setView('dashboard'); }}
            collapsed={isCollapsed}
          />
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <NavItem
            icon={<Settings size={20} />}
            label="Settings"
            active={false}
            onClick={() => { }}
            collapsed={isCollapsed}
          />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
        <header style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#111', margin: 0 }}>
            {view === 'project_details' ? 'Project Details' : (activeTab === 'dashboard' ? 'Dashboard' : 'Recent Sessions')}
          </h2>
          <p style={{ color: '#666', marginTop: '5px' }}>
            {view === 'project_details' ? 'File-level activity analysis' : (activeTab === 'dashboard' ? 'Overview of your activity' : 'History of your coding sessions')}
          </p>
        </header>

        {error && (
          <div style={errorStyle}>
            <strong>Connection Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {view === 'project_details' && selectedProject ? (
              <ProjectDetails projectPath={selectedProject} onBack={handleBack} />
            ) : (
              <>
                {activeTab === 'dashboard' && <Dashboard sessions={sessions} onProjectClick={handleProjectClick} />}
                {activeTab === 'sessions' && <SessionList sessions={sessions} />}
                {activeTab === 'projects' && <ProjectList onProjectClick={handleProjectClick} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick, collapsed }: any) => (
  <div
    onClick={onClick}
    title={collapsed ? label : ''}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      borderRadius: '8px',
      cursor: 'pointer',
      color: active ? '#111' : '#666',
      background: active ? '#f0f0f0' : 'transparent',
      fontWeight: active ? 600 : 400,
      transition: 'all 0.2s',
      justifyContent: collapsed ? 'center' : 'flex-start'
    }}
  >
    {icon}
    {!collapsed && <span>{label}</span>}
  </div>
);

const errorStyle: React.CSSProperties = {
  color: '#721c24',
  backgroundColor: '#f8d7da',
  borderColor: '#f5c6cb',
  padding: '12px',
  borderRadius: '8px',
  marginBottom: '20px'
};

export default App;