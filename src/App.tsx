/**
 * ChronoStage - Cross-Platform Multi-Stage Timer & Event Schedule App
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TimerProvider, useTimer } from './context/TimerContext';
import { Header } from './components/common/Header';
import { TodayView } from './components/today/TodayView';
import { ScheduleCalendarView } from './components/schedule/ScheduleCalendarView';
import { ProgramsListView } from './components/programs/ProgramsListView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { ActiveTimerView } from './components/timer/ActiveTimerView';
import { PresenterMode } from './components/timer/PresenterMode';
import { ScheduleEventModal } from './components/schedule/ScheduleEventModal';
import { Program } from './types';

const MainLayout: React.FC = () => {
  const { activeTab, displayMode } = useApp();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalProgram, setScheduleModalProgram] = useState<Program | null>(null);
  const [scheduleModalDate, setScheduleModalDate] = useState<string | undefined>();

  const handleOpenScheduleModal = (initialDate?: string) => {
    setScheduleModalProgram(null);
    setScheduleModalDate(initialDate);
    setScheduleModalOpen(true);
  };

  const handleScheduleSpecificProgram = (prog: Program) => {
    setScheduleModalProgram(prog);
    setScheduleModalDate(undefined);
    setScheduleModalOpen(true);
  };

  // Fullscreen Presenter Mode
  if (displayMode === 'presenter') {
    return <PresenterMode />;
  }

  // Active Timer View (Focused screen)
  if (displayMode === 'timer') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <ActiveTimerView />
      </div>
    );
  }

  // Standard Navigation View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 md:pb-8">
      <Header />

      <main className="flex-1 w-full">
        {activeTab === 'today' && (
          <TodayView onOpenScheduleModal={() => handleOpenScheduleModal()} />
        )}
        {activeTab === 'schedule' && (
          <ScheduleCalendarView onOpenScheduleModal={(d) => handleOpenScheduleModal(d)} />
        )}
        {activeTab === 'programs' && (
          <ProgramsListView onScheduleProgram={handleScheduleSpecificProgram} />
        )}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Schedule Modal */}
      <ScheduleEventModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        initialProgram={scheduleModalProgram}
        initialDate={scheduleModalDate}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <TimerProvider>
        <MainLayout />
      </TimerProvider>
    </AppProvider>
  );
}
