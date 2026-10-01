import React, { useState, useEffect } from 'react';
import {
  Play,
  Calendar,
  Clock,
  CheckCircle,
  Plus,
  AlertCircle,
  Radio,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTimer } from '../../context/TimerContext';
import { ScheduledEvent } from '../../types';
import {
  computeTimeline,
  formatDateRu,
  formatDuration,
  getEpochFromDateTime,
  getTodayDateString,
  secondsToTimeString,
} from '../../utils/time';

export const TodayView: React.FC<{ onOpenScheduleModal: () => void }> = ({ onOpenScheduleModal }) => {
  const { events, programs, launchTimerForEvent, setActiveTab } = useApp();
  const { activeSession, isRunning, startEventTimer } = useTimer();

  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const todayStr = getTodayDateString();

  // Keep live time ticking for upcoming event countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter today's events sorted by scheduled time
  const todayEvents = events
    .filter((e) => e.scheduledDate === todayStr)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  // Find nearest upcoming or current event
  const upcomingEvent = todayEvents.find((e) => {
    if (e.status === 'completed' || e.status === 'cancelled') return false;
    return true;
  });

  // Calculate countdown to nearest upcoming event
  let secondsUntilUpcoming: number | null = null;
  if (upcomingEvent) {
    const eventStartEpoch = getEpochFromDateTime(upcomingEvent.scheduledDate, upcomingEvent.scheduledTime);
    const diffSeconds = Math.round((eventStartEpoch - currentTimeMs) / 1000);
    secondsUntilUpcoming = diffSeconds;
  }

  const handleStartNow = (event: ScheduledEvent) => {
    startEventTimer(event);
    launchTimerForEvent(event, false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
      {/* Top Banner / Hero Card */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Сегодня
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {formatDateRu(todayStr)} · {new Date().toLocaleDateString('ru-RU', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <button
            onClick={onOpenScheduleModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Запланировать</span>
          </button>
        </div>

        {/* Running Event Card (If a session is active) */}
        {activeSession ? (
          <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-4 w-4 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                </span>
                <div>
                  <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                    В ЭФИРЕ ПРЯМО СЕЙЧАС
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                    {activeSession.programTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Текущий этап: <strong className="text-white">{activeSession.items[activeSession.currentItemIndex]?.title}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const ev = events.find((e) => e.id === activeSession.eventId);
                  if (ev) launchTimerForEvent(ev);
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20"
              >
                <Radio className="w-4 h-4" />
                <span>Открыть экран таймера</span>
              </button>
            </div>
          </div>
        ) : upcomingEvent ? (
          /* Upcoming Event Spotlight Card */
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xs shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-wider uppercase">
                  <Clock className="w-4 h-4" />
                  <span>Ближайшая программа</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {upcomingEvent.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400">
                  <span>Запланировано на: <strong className="text-slate-200">{upcomingEvent.scheduledTime.slice(0, 5)}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Длительность: <strong className="text-slate-200">{formatDuration(upcomingEvent.calculatedDurationSeconds)}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Этапов: <strong className="text-slate-200">{upcomingEvent.snapshotItems.length}</strong></span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="text-left sm:text-right">
                  <div className="text-xs text-slate-400 uppercase font-semibold">
                    {secondsUntilUpcoming !== null && secondsUntilUpcoming > 0 ? 'До начала осталось' : 'Время наступило'}
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-extrabold text-blue-400 tabular-nums">
                    {secondsUntilUpcoming !== null && secondsUntilUpcoming > 0
                      ? formatDuration(secondsUntilUpcoming, true)
                      : '00:00:00'}
                  </div>
                </div>

                <button
                  onClick={() => handleStartNow(upcomingEvent)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white transition shadow-md whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Запустить сейчас</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h3 className="text-lg font-bold text-white">На сегодня всё запланированное завершено</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Вы можете запланировать новое мероприятие на сегодня или запустить любую программу из библиотеки.
            </p>
          </div>
        )}
      </div>

      {/* Today's Full Schedule List */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Программа дня</span>
            <span className="text-xs font-normal text-slate-400">({todayEvents.length})</span>
          </h2>
          <button
            onClick={() => setActiveTab('schedule')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            <span>Всё расписание</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayEvents.length === 0 ? (
          <div className="p-6 rounded-2xl border border-slate-850 bg-slate-900/30 text-center text-slate-400 text-sm">
            Нет событий на сегодня. Нажмите «Запланировать», чтобы добавить мероприятие.
          </div>
        ) : (
          <div className="space-y-3">
            {todayEvents.map((event) => {
              const isEventRunning = activeSession?.eventId === event.id;
              const isCompleted = event.status === 'completed';
              const isCancelled = event.status === 'cancelled';

              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isEventRunning
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : isCompleted
                      ? 'border-slate-800/60 bg-slate-900/30 opacity-70'
                      : isCancelled
                      ? 'border-slate-800/40 bg-slate-900/20 opacity-50'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 text-center w-14 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-200">
                      {event.scheduledTime.slice(0, 5)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-base font-bold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                          {event.title}
                        </h4>
                        {isEventRunning && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            В ЭФИРЕ
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] text-slate-400">
                            Завершено
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>{formatDuration(event.calculatedDurationSeconds)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{event.snapshotItems.length} этапов</span>
                        {event.category && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{event.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!isCompleted && !isCancelled && (
                      <button
                        onClick={() => handleStartNow(event)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isEventRunning
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-slate-800 text-slate-200 hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isEventRunning ? 'Продолжить' : 'Старт'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Launch From Templates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Быстрый запуск из программ</span>
          </h2>
          <button
            onClick={() => setActiveTab('programs')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            Все программы ({programs.length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {programs.slice(0, 3).map((prog) => (
            <div
              key={prog.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider block mb-1">
                  {prog.category || 'Программа'}
                </span>
                <h4 className="text-sm font-bold text-white line-clamp-1 mb-1">
                  {prog.title}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {prog.description || `${prog.items.length} этапов`}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="font-mono text-slate-300">
                  {formatDuration(prog.calculatedDurationSeconds)}
                </span>
                <button
                  onClick={() => {
                    const tempEvent: ScheduledEvent = {
                      id: `quick-${Date.now()}`,
                      programId: prog.id,
                      title: prog.title,
                      description: prog.description,
                      category: prog.category,
                      scheduledDate: todayStr,
                      scheduledTime: new Date().toTimeString().split(' ')[0],
                      calculatedDurationSeconds: prog.calculatedDurationSeconds,
                      status: 'scheduled',
                      snapshotItems: prog.items.map((it) => ({ ...it })),
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    handleStartNow(tempEvent);
                  }}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Старт</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
