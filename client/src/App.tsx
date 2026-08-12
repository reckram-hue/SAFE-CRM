import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, NavLink } from 'react-router-dom';
import ClientsListPage from './pages/ClientsListPage';
import AddClientPage from './pages/AddClientPage';
import EditClientPage from './pages/EditClientPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import ReconciliationPage from './pages/ReconciliationPage';
import { API_BASE } from './config/api';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
}

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const checkHealth = () => {
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(data => {
        setHealth(data);
      })
      .catch(err => {
        console.error("Health check failed:", err);
        setHealth(null);
      });
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            to="/clients"
            className="flex items-center gap-3 cursor-pointer group hover:no-underline"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
              <span className="font-extrabold text-white text-lg tracking-wider">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white m-0">SAFE-CRM</h1>
              <p className="text-xs text-slate-400 m-0">Enterprise Client Relationship Management</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">System Status:</span>
            {/* Header Right */}
            <div className="flex items-center gap-6">
              {health ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">System Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                  <span className="text-xs font-bold tracking-wider text-rose-400 uppercase">System Offline</span>
                </div>
              )}
              
              <NavLink
                to="/admin/reconciliation"
                className={({ isActive }) => 
                  `text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-300 hover:text-white'}`
                }
              >
                Reconciliation
              </NavLink>

              <NavLink
                to="/admin/settings"
                className={({ isActive }) => 
                  `text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-300 hover:text-white'}`
                }
              >
                Admin Settings
              </NavLink>

              <NavLink 
                to="/clients/new"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 ${
                    isActive 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`
                }
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Client
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/clients" replace />} />
          <Route path="/clients" element={<ClientsListPage />} />
          <Route path="/clients/new" element={<AddClientPage />} />
          <Route path="/clients/edit/:id" element={<EditClientPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/reconciliation" element={<ReconciliationPage />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-800 py-6 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-slate-500">
          <p>© 2026 SAFE-CRM Enterprise. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-300 transition-colors">Documentation</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
