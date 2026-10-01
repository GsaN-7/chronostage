import React, { useState } from 'react';
import {
  Plus,
  Play,
  Calendar,
  Copy,
  Edit2,
  Trash2,
  Clock,
  Layers,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTimer } from '../../context/TimerContext';
import { Program, ScheduledEvent } from '../../types';
import { formatDuration, formatDurationTextRu, getTodayDateString } from '../../utils/time';
import { ProgramEditorModal } from './ProgramEditorModal';

interface ProgramsListViewProps {
  onScheduleProgram: (program: Program) => void;
}

export const ProgramsListView: React.FC<ProgramsListViewProps> = ({ onScheduleProgram }) => {
  const { programs, createProgram, updateProgram, deleteProgram, duplicateProgram, launchTimerForEvent } = useApp();
  const { startEventTimer } = useTimer();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const categories = ['all', ...Array.from(new Set(programs.map((p) => p.category || 'Общие')))];

  const filtered = programs.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || (p.category || 'Общие') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleQuickLaunch = (prog: Program) => {
    const quickEvent: ScheduledEvent = {
      id: `quick-${Date.now()}`,
      programId: prog.id,
      title: prog.title,
      description: prog.description,
      category: prog.category,
      scheduledDate: getTodayDateString(),
      scheduledTime: new Date().toTimeString().split(' ')[0],
      calculatedDurationSeconds: prog.calculatedDurationSeconds,
      status: 'scheduled',
      snapshotItems: prog.items.map((it) => ({ ...it })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    startEventTimer(quickEvent);
    launchTimerForEvent(quickEvent, false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Программы и Шаблоны
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Библиотека многоразовых сценариев: создавайте, редактируйте и запускайте
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProgram(null);
            setIsEditorOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs sm:text-sm text-white transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Новая программа</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Clean interactive filter tabs (permitted by frontend design constitution) */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-900 rounded-xl border border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'Все категории' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Programs */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-850 bg-slate-900/30">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Программы не найдены</h3>
          <p className="text-xs text-slate-400 mb-4">Попробуйте изменить поисковый запрос или создайте новую программу.</p>
          <button
            onClick={() => {
              setEditingProgram(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white"
          >
            Создать программу
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prog) => (
            <div
              key={prog.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                    {prog.category || 'Программа'}
                  </span>
                  <span className="font-mono text-xs text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    {formatDuration(prog.calculatedDurationSeconds)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white line-clamp-1 mb-1.5">
                  {prog.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {prog.description || 'Последовательность этапов с автоматическим переходом.'}
                </p>

                {/* Items preview preview */}
                <div className="space-y-1.5 mb-4 border-t border-slate-800/80 pt-3">
                  <div className="text-[11px] font-medium text-slate-400 mb-1">
                    Этапы ({prog.items.length}):
                  </div>
                  {prog.items.slice(0, 3).map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-xs text-slate-300">
                      <span className="truncate pr-2">{it.order}. {it.title}</span>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        {formatDuration(it.durationSeconds)}
                      </span>
                    </div>
                  ))}
                  {prog.items.length > 3 && (
                    <div className="text-[11px] text-slate-500 italic">
                      + еще {prog.items.length - 3} пунктов...
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingProgram(prog);
                      setIsEditorOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Редактировать"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => duplicateProgram(prog.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Дублировать программу"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onScheduleProgram(prog)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                    title="Запланировать в расписании"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteProgram(prog.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleQuickLaunch(prog)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Старт</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Editor Modal */}
      <ProgramEditorModal
        isOpen={isEditorOpen}
        initialProgram={editingProgram}
        onClose={() => setIsEditorOpen(false)}
        onSave={(data, syncFuture) => {
          if (editingProgram) {
            updateProgram(editingProgram.id, data, syncFuture);
          } else {
            createProgram(data);
          }
        }}
      />
    </div>
  );
};
