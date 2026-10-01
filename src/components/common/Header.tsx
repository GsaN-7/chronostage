import React from 'react';
import { Calendar, Clock, Layers, History, Settings, Play, Radio, Monitor } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTimer } from '../../context/TimerContext';
import { PWAInstallButton } from './PWAInstallButton';
import { ActiveTab } from '../../types';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab, displayMode, setDisplayMode } = useApp();
  const { isRunning, isPaused, activeSession } = useTimer();

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'today', label: 'Сегодня', icon: Clock },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    { id: 'programs', label: 'Программы', icon: Layers },
    { id: 'history', label: 'История', icon: History },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Bar (Top Bar Contract: 3 zones, single row) */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Zone 1: Single text element brand wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setDisplayMode('standard');
                setActiveTab('today');
              }}
              className="text-left font-bold text-lg tracking-tight text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Clock className="w-4 h-4" />
              </span>
              <span>ChronoStage</span>
            </button>
          </div>

          {/* Zone 2: Primary navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && displayMode === 'standard';
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setDisplayMode('standard');
                    setActiveTab(item.id);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800/90 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2.5">
            {/* Active Running Session Indicator Button */}
            {activeSession && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDisplayMode(displayMode === 'timer' ? 'standard' : 'timer')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                    displayMode === 'timer'
                      ? 'bg-blue-600 text-white'
                      : isRunning
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {isRunning && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        isRunning ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    ></span>
                  </span>
                  <span className="hidden sm:inline">
                    {displayMode === 'timer' ? 'Закрыть таймер' : 'В эфире'}
                  </span>
                  <span className="sm:hidden">Таймер</span>
                </button>

                <button
                  onClick={() => setDisplayMode('presenter')}
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  title="Режим ведущего (Presenter Mode)"
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
            )}

            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Tab Bar (Ergonomic Thumb Zone) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && displayMode === 'standard';
            return (
              <button
                key={item.id}
                onClick={() => {
                  setDisplayMode('standard');
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  isActive ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] tracking-tight truncate max-w-[60px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
