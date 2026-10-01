import React, { useState } from 'react';
import { X, Calendar, Clock, Repeat, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Program, RecurrenceFrequency, RecurrenceRule, ScheduledEvent } from '../../types';
import { formatDuration, formatDurationTextRu, getTodayDateString } from '../../utils/time';

interface ScheduleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProgram?: Program | null;
  initialDate?: string;
}

export const ScheduleEventModal: React.FC<ScheduleEventModalProps> = ({
  isOpen,
  onClose,
  initialProgram,
  initialDate,
}) => {
  const { programs, createEvent } = useApp();

  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    initialProgram?.id || (programs.length > 0 ? programs[0].id : '')
  );
  const [scheduledDate, setScheduledDate] = useState<string>(initialDate || getTodayDateString());
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('none');
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Monday default
  const [endDate, setEndDate] = useState<string>('');

  if (!isOpen) return null;

  const currentProgram = programs.find((p) => p.id === selectedProgramId) || programs[0];

  const handleDayToggle = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProgram) return;

    let recurrenceRule: RecurrenceRule | undefined;
    if (frequency !== 'none') {
      recurrenceRule = {
        frequency,
        interval: 1,
        startDate: scheduledDate,
        endDate: endDate ? endDate : undefined,
        daysOfWeek: frequency === 'weekly' ? selectedDays : undefined,
      };
    }

    createEvent({
      programId: currentProgram.id,
      title: currentProgram.title,
      description: currentProgram.description,
      category: currentProgram.category,
      scheduledDate,
      scheduledTime: `${scheduledTime}:00`,
      targetDurationSeconds: currentProgram.targetDurationSeconds,
      snapshotItems: currentProgram.items.map((it) => ({
        id: it.id,
        order: it.order,
        title: it.title,
        durationSeconds: it.durationSeconds,
        description: it.description,
        speaker: it.speaker,
      })),
      recurrenceRule,
    });

    onClose();
  };

  const dayLabels = [
    { num: 1, label: 'Пн' },
    { num: 2, label: 'Вт' },
    { num: 3, label: 'Ср' },
    { num: 4, label: 'Чт' },
    { num: 5, label: 'Пт' },
    { num: 6, label: 'Сб' },
    { num: 0, label: 'Вс' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Запланировать мероприятие</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Program Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Программа (шаблон)
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-hidden"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({formatDuration(p.calculatedDurationSeconds)})
                </option>
              ))}
            </select>
          </div>

          {currentProgram && (
            <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span>Пунктов в программе: <strong>{currentProgram.items.length}</strong></span>
                <span>Длительность: <strong>{formatDurationTextRu(currentProgram.calculatedDurationSeconds)}</strong></span>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Дата проведения
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Время начала
              </label>
              <input
                type="time"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Recurrence Rule */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-blue-400" />
              <span>Повторение события</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-hidden mb-3"
            >
              <option value="none">Однократно (без повторения)</option>
              <option value="daily">Каждый день</option>
              <option value="weekdays">По будням (Пн-Пт)</option>
              <option value="weekly">Еженедельно в выбранные дни</option>
              <option value="monthly">Каждый месяц</option>
            </select>

            {frequency === 'weekly' && (
              <div className="mb-3">
                <span className="block text-xs text-slate-400 mb-1.5">Дни недели:</span>
                <div className="flex gap-1.5">
                  {dayLabels.map(({ num, label }) => {
                    const isSelected = selectedDays.includes(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleDayToggle(num)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {frequency !== 'none' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Дата окончания повторения (опция)
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={scheduledDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="До конца года или бессрочно"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow-sm"
            >
              Запланировать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
