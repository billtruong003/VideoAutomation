/**
 * App.tsx — the shell: sidebar navigation and routing.
 *
 * Deliberately thin. It owns layout and nothing else; every page fetches its own data through
 * `api.ts`. No global store, because there is no state genuinely shared across pages that a
 * request cannot supply — a store here would be ceremony.
 */

import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useQuery, type Channel, type Job } from './api';

import Dashboard from './pages/Dashboard';
import Videos from './pages/Videos';
import VideoDetail from './pages/VideoDetail';
import MetadataStudio from './pages/MetadataStudio';
import PublishStudio from './pages/PublishStudio';
import Queue from './pages/Queue';
import AudioLibrary from './pages/AudioLibrary';
import Analytics from './pages/Analytics';
import Retention from './pages/Retention';
import ApiHealth from './pages/ApiHealth';
import Settings from './pages/Settings';

const NAV = [
  { label: null, items: [{ to: '/dashboard', text: 'Dashboard' }] },
  {
    label: 'Content',
    items: [
      { to: '/videos', text: 'Videos' },
      { to: '/metadata', text: 'Metadata Studio' },
      { to: '/audio', text: 'Audio Library' },
    ],
  },
  {
    label: 'Publish',
    items: [
      { to: '/publish', text: 'Publish Studio' },
      { to: '/queue', text: 'Queue', badge: 'jobs' as const },
    ],
  },
  {
    label: 'Performance',
    items: [
      { to: '/analytics', text: 'Analytics' },
      { to: '/retention', text: 'Retention' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/health', text: 'API Health' },
      { to: '/settings', text: 'Settings' },
    ],
  },
];

export default function App() {
  const channel = useQuery<Channel>('/channel');
  const jobs = useQuery<Job[]>('/queue');
  const activeJobs = (jobs.data ?? []).filter((j) => ['PENDING', 'RUNNING', 'RETRY_WAIT'].includes(j.state)).length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">BF</div>
          <div>
            <div className="brand-name">Bill Finds Out</div>
            <div className="brand-handle">{channel.data?.handle ?? 'Creator OS'}</div>
          </div>
        </div>

        {NAV.map((group, i) => (
          <nav className="nav-group" key={i}>
            {group.label && <div className="nav-label">{group.label}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span>{item.text}</span>
                {'badge' in item && item.badge === 'jobs' && activeJobs > 0 && (
                  <span className="pill">{activeJobs}</span>
                )}
              </NavLink>
            ))}
          </nav>
        ))}

        <div style={{ marginTop: 'auto', padding: '0 10px', fontSize: 11, color: 'var(--ink-faint)' }}>
          Local only · 127.0.0.1
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/videos/:id" element={<VideoDetail />} />
          <Route path="/metadata" element={<MetadataStudio />} />
          <Route path="/metadata/:id" element={<MetadataStudio />} />
          <Route path="/audio" element={<AudioLibrary />} />
          <Route path="/publish" element={<PublishStudio />} />
          <Route path="/publish/:id" element={<PublishStudio />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/retention" element={<Retention />} />
          <Route path="/retention/:id" element={<Retention />} />
          <Route path="/health" element={<ApiHealth />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
