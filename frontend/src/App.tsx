import { useState } from 'react';
import {
  LayoutDashboard,
  UserCheck,
  FileSpreadsheet,
  Gauge,
  ShieldAlert,
  Database,
  Cpu
} from 'lucide-react';
import { DashboardHome } from './components/DashboardHome';
import { SinglePredictor } from './components/SinglePredictor';
import { BatchAnalysis } from './components/BatchAnalysis';
import { ModelPerformance } from './components/ModelPerformance';

type TabType = 'dashboard' | 'predict' | 'batch' | 'performance';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [resetting, setResetting] = useState<boolean>(false);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset the database? This will clear all uploaded batch predictions and restore the baseline seed data.")) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/dashboard/reset', { method: 'POST' });
      if (res.ok) {
        alert("Database successfully reset to baseline.");
      } else {
        alert("Failed to reset database.");
      }
    } catch (err) {
      console.error(err);
      alert("Error resetting database.");
    } finally {
      setResetting(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome onReset={handleReset} isLoadingReset={resetting} />;
      case 'predict':
        return <SinglePredictor />;
      case 'batch':
        return <BatchAnalysis />;
      case 'performance':
        return <ModelPerformance />;
      default:
        return <DashboardHome onReset={handleReset} isLoadingReset={resetting} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#0F172A] text-slate-100 flex flex-col justify-between shrink-0 sidebar-shadow select-none z-20">

        <div className="flex flex-col space-y-7 py-6">
          {/* Brand Logo Header */}
          <div className="px-6 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-tight text-white flex items-center space-x-1">
                <span>ChurnGuard</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Retention Intel</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 flex flex-col space-y-1.5">
            {/* Tab: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              <span>Dashboard Home</span>
            </button>

            {/* Tab: Predict Single Customer */}
            <button
              onClick={() => setActiveTab('predict')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'predict'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <UserCheck className="h-4.5 w-4.5" />
              <span>Predict Single Customer</span>
            </button>

            {/* Tab: Batch Analysis */}
            <button
              onClick={() => setActiveTab('batch')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'batch'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="h-4.5 w-4.5" />
              <span>Batch Analysis</span>
            </button>

            {/* Tab: Model Performance */}
            <button
              onClick={() => setActiveTab('performance')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'performance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Gauge className="h-4.5 w-4.5" />
              <span>Model Performance</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer metadata */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 space-y-1.5 font-mono select-none">
          <div className="flex items-center space-x-1.5">
            <Cpu className="h-3 w-3 text-slate-500" />
            <span>Model: Logistic Reg v1.0</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Database className="h-3 w-3 text-slate-500" />
            <span>Engine: SQLite Dialect</span>
          </div>
          <div className="text-[9px] text-slate-600 pt-1">
            ChurnGuard Intelligence &copy; 2026
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 max-w-[1300px] mx-auto z-10">

        {/* Render Active Tab Screen */}
        <div className="animate-fadeIn duration-200">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}