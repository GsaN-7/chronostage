import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Trash2,
  XCircle,
  Repeat,
  Plus,
  Info,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTimer } from '../../context/TimerContext';
import { ScheduledEvent } from '../../types';
import {
  computeTimeline,
  formatDateRu,
  formatDuration,
  getTodayDateString,
  secondsToTimeString,
  timeStringToSeconds,
} from '../../utils/time';
import { expandRecurringEventForWindow } from '../../utils/recurrence';

type CalendarMode = 'day' | 'week' | 'month' | 'list';

interface ScheduleCalendarViewProps {
  onOpenScheduleModal: (initialDate?: string) => void;
}

export const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({ onOpenScheduleModal }) => {
  const { events, deleteEvent, cancelEvent, launchTimerForEvent } = useApp();
  const { startEventTimer } = useTimer();

  const [mode, setMode] = useState<CalendarMode>('week');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedEvent, setSelectedEvent] = useState<ScheduledEvent | null>(null);

  // Compute date range based on mode & selectedDate
  const { windowStart, windowEnd, dateList } = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const centerDate = new Date(y, m - 1, d);

    if (mode === 'day') {
      return {
        windowStart: selectedDate,
        windowEnd: selectedDate,
        dateList: [selectedDate],
      };
    } else if (mode === 'week') {
      const curDay = centerDate.getDay(); // 0 = Sun
      const distanceToMon = (curDay + 6) % 7;
      const monday = new Date(centerDate);
      monday.setDate(monday.getDate() - distanceToMon);

      const list: string[] = [];
      for (let i = 0; i < 7; i++) {
        const dObj = new Date(monday);
        dObj.setDate(dObj.getDate() + i);
        const yStr = dObj.getFullYear();
        const mStr = (dObj.getMonth() + 1).toString().padStart(2, '0');
        const dayStr = dObj.getDate().toString().padStart(2, '0');
        list.push(`${yStr}-${mStr}-${dayStr}`);
      }
      return {
        windowStart: list[0],
        windowEnd: list[list.length - 1],
        dateList: list,
      };
    } else {
      // Month
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);

      // Pad to start from Monday
      const startPad = (firstDay.getDay() + 6) % 7;
      const startCalendarDate = new Date(firstDay);
      startCalendarDate.setDate(startCalendarDate.getDate() - startPad);

      const list: string[] = [];
      const iter = new Date(startCalendarDate);
      while (list.length < 35 || iter <= lastDay) {
        const yStr = iter.getFullYear();
        const mStr = (iter.getMonth() + 1).toString().padStart(2, '0');
        const dayStr = iter.getDate().toString().padStart(2, '0');
        list.push(`${yStr}-${mStr}-${dayStr}`);
        iter.setDate(iter.getDate() + 1);
      }
      return {
        windowStart: list[0],
        windowEnd: list[list.length - 1],
        dateList: list,
      };
    }
  }, [mode, selectedDate]);

  // Expand recurring instances for this calendar view
  const allDisplayEvents = useMemo(() => {
    const existingDates = new Set(events.map((e) => e.scheduledDate));
    const list = [...events];

    events.forEach((parent) => {
      if (parent.recurrenceRule && parent.recurrenceRule.frequency !== 'none') {
        const expanded = expandRecurringEventForWindow(parent, windowStart, windowEnd, existingDates);
        list.push(...expanded);
      }
    });

    return list.sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) {
        return a.scheduledDate.localeCompare(b.scheduledDate);
      }
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
  }, [events, windowStart, windowEnd]);

  // Navigate calendar
  const handlePrev = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (mode === 'day') date.setDate(date.getDate() - 1);
    else if (mode === 'week') date.setDate(date.getDate() - 7);
    else date.setMonth(date.getMonth() - 1);

    const ny = date.getFullYear();
    const nm = (date.getMonth() + 1).toString().padStart(2, '0');
    const nd = date.getDate().toString().padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  const handleNext = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (mode === 'day') date.setDate(date.getDate() + 1);
    else if (mode === 'week') date.setDate(date.getDate() + 7);
    else date.setMonth(date.getMonth() + 1);

    const ny = date.getFullYear();
    const nm = (date.getMonth() + 1).toString().padStart(2, '0');
    const nd = date.getDate().toString().padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  const handleStartTimer = (ev: ScheduledEvent) => {
    startEventTimer(ev);
    launchTimerForEvent(ev, false);
    setSelectedEvent(null);
  };

  const todayStr = getTodayDateString();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Расписание мероприятий
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Календарь запусков и периодических программ
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {(['day', 'week', 'month', 'list'] as CalendarMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                  mode === m
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'day' ? 'День' : m === 'week' ? 'Неделя' : m === 'month' ? 'Месяц' : 'Список'}
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenScheduleModal(selectedDate)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs sm:text-sm text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Добавить событие</span>
            <span className="sm:hidden">Создать</span>
          </button>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/60 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedDate(todayStr)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition ml-1"
          >
            Сегодня
          </button>
        </div>

        <div className="text-sm font-bold text-white">
          {mode === 'day' && formatDateRu(selectedDate)}
          {mode === 'week' && `${formatDateRu(windowStart)} — ${formatDateRu(windowEnd)}`}
          {mode === 'month' &&
            new Date(selectedDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          {mode === 'list' && 'Ближайшие события'}
        </div>
      </div>

      {/* Week View Grid */}
      {mode === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
          {dateList.map((dateStr) => {
            const dayEvents = allDisplayEvents.filter((e) => e.scheduledDate === dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dateObj = new Date(dateStr);

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`p-3 rounded-xl border transition flex flex-col justify-start min-h-[180px] cursor-pointer ${
                  isToday
                    ? 'border-blue-500/50 bg-blue-950/20'
                    : isSelected
                    ? 'border-slate-700 bg-slate-900/80'
                    : 'border-slate-850 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="text-xs font-medium text-slate-400">
                    {dateObj.toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-200'
                    }`}
                  >
                    {dateObj.getDate()}
                  </span>
                </div>

                <div className="space-y-1.5 overflow-y-auto">
                  {dayEvents.map((ev) => {
                    const startSec = timeStringToSeconds(ev.scheduledTime);
                    const endSec = startSec + ev.calculatedDurationSeconds;
                    const endTimeStr = secondsToTimeString(endSec, false);

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-blue-500/40 text-left transition group"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{ev.scheduledTime.slice(0, 5)} - {endTimeStr}</span>
                          {ev.recurrenceRule && <Repeat className="w-2.5 h-2.5 text-blue-400" />}
                        </div>
                        <div className="text-xs font-bold text-white truncate mt-0.5 group-hover:text-blue-300">
                          {ev.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View Grid */}
      {mode === 'month' && (
        <div className="grid grid-cols-7 gap-1.5">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
              {d}
            </div>
          ))}
          {dateList.map((dateStr) => {
            const dayEvents = allDisplayEvents.filter((e) => e.scheduledDate === dateStr);
            const isToday = dateStr === todayStr;
            const dateObj = new Date(dateStr);
            const isCurrentMonth = dateObj.getMonth() === new Date(selectedDate).getMonth();

            return (
              <div
                key={dateStr}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setMode('day');
                }}
                className={`p-2 rounded-xl border min-h-[90px] text-left transition cursor-pointer flex flex-col justify-between ${
                  isToday
                    ? 'border-blue-500/50 bg-blue-950/20'
                    : isCurrentMonth
                    ? 'border-slate-850 bg-slate-900/40 hover:border-slate-700'
                    : 'border-slate-900 bg-slate-950/40 opacity-40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-bold ${
                      isToday ? 'text-blue-400' : 'text-slate-300'
                    }`}
                  >
                    {dateObj.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-blue-400 font-mono font-semibold">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="text-[10px] truncate text-slate-300 bg-slate-950/80 px-1 py-0.5 rounded-sm"
                    >
                      {ev.scheduledTime.slice(0, 5)} {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] text-slate-400">+ ещё {dayEvents.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day or List View */}
      {(mode === 'day' || mode === 'list') && (
        <div className="space-y-3">
          {(mode === 'day'
            ? allDisplayEvents.filter((e) => e.scheduledDate === selectedDate)
            : allDisplayEvents
          ).length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-slate-850 bg-slate-900/30 text-slate-400">
              Нет запланированных мероприятий.
            </div>
          ) : (
            (mode === 'day'
              ? allDisplayEvents.filter((e) => e.scheduledDate === selectedDate)
              : allDisplayEvents
            ).map((ev) => {
              const startSec = timeStringToSeconds(ev.scheduledTime);
              const endSec = startSec + ev.calculatedDurationSeconds;
              const endTimeStr = secondsToTimeString(endSec, false);

              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center w-24 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
                      <div>{ev.scheduledDate}</div>
                      <div className="text-blue-400 font-bold">{ev.scheduledTime.slice(0, 5)} - {endTimeStr}</div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{ev.title}</h4>
                        {ev.recurrenceRule && (
                          <span className="flex items-center gap-1 text-[11px] text-blue-400">
                            <Repeat className="w-3 h-3" />
                            <span>Периодическое</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{formatDuration(ev.calculatedDurationSeconds)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ev.snapshotItems.length} этапов</span>
                        {ev.category && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{ev.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTimer(ev);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Запустить</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                  Детали события
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedEvent.title}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs">
                <div>
                  <span className="text-slate-400 block">Дата и время:</span>
                  <strong className="text-slate-200">
                    {formatDateRu(selectedEvent.scheduledDate)} в {selectedEvent.scheduledTime.slice(0, 5)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Общее время:</span>
                  <strong className="text-slate-200">
                    {formatDuration(selectedEvent.calculatedDurationSeconds)}
                  </strong>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Программа мероприятия ({selectedEvent.snapshotItems.length} этапов):
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {computeTimeline(selectedEvent.scheduledTime, selectedEvent.snapshotItems).map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80"
                    >
                      <div className="truncate pr-2">
                        <span className="font-mono text-slate-500 w-5 inline-block">{it.order}.</span>
                        <span className="text-slate-200 font-medium">{it.title}</span>
                        {it.speaker && <span className="text-slate-400 ml-1">({it.speaker})</span>}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 shrink-0">
                        {it.startTimeFormatted} - {it.endTimeFormatted} ({formatDuration(it.durationSeconds)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recurrence Info if any */}
              {selectedEvent.recurrenceRule && (
                <div className="p-3 rounded-xl border border-blue-900/40 bg-blue-950/20 text-xs text-slate-300 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Повторяющееся событие ({selectedEvent.recurrenceRule.frequency})
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-950">
              <button
                onClick={() => {
                  deleteEvent(selectedEvent.id, false);
                  setSelectedEvent(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить</span>
              </button>

              <button
                onClick={() => handleStartTimer(selectedEvent)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Запустить таймер</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
