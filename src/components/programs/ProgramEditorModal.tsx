import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { Program, ProgramItem } from '../../types';
import { calculateTotalDuration, computeTimeline, formatDuration, formatDurationTextRu } from '../../utils/time';

interface ProgramEditorModalProps {
  initialProgram?: Program | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt' | 'calculatedDurationSeconds'>,
    syncFutureEvents?: boolean
  ) => void;
}

export const ProgramEditorModal: React.FC<ProgramEditorModalProps> = ({
  initialProgram,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialProgram?.title || '');
  const [description, setDescription] = useState(initialProgram?.description || '');
  const [category, setCategory] = useState(initialProgram?.category || 'Совещания');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState<number>(
    initialProgram?.targetDurationSeconds ? Math.round(initialProgram.targetDurationSeconds / 60) : 0
  );
  const [previewStartTime, setPreviewStartTime] = useState('10:00');
  const [syncFutureEvents, setSyncFutureEvents] = useState(true);

  const [items, setItems] = useState<ProgramItem[]>(
    initialProgram?.items.length
      ? initialProgram.items.map((it) => ({ ...it }))
      : [
          { id: 'item-1', order: 1, title: 'Вступление', durationSeconds: 5 * 60 },
          { id: 'item-2', order: 2, title: 'Основная часть', durationSeconds: 20 * 60 },
          { id: 'item-3', order: 3, title: 'Заключение и вопросы', durationSeconds: 10 * 60 },
        ]
  );

  const totalCalculatedSeconds = calculateTotalDuration(items);
  const targetDurationSeconds = targetDurationMinutes > 0 ? targetDurationMinutes * 60 : undefined;
  const differenceSeconds = targetDurationSeconds ? targetDurationSeconds - totalCalculatedSeconds : 0;

  // Re-index order numbers
  const reorder = (list: ProgramItem[]) => list.map((item, idx) => ({ ...item, order: idx + 1 }));

  const handleAddItem = () => {
    const newItem: ProgramItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      order: items.length + 1,
      title: 'Новый этап',
      durationSeconds: 10 * 60,
    };
    setItems(reorder([...items, newItem]));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(reorder(items.filter((it) => it.id !== id)));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    setItems(reorder(next));
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    setItems(reorder(next));
  };

  const handleItemChange = (id: string, updates: Partial<ProgramItem>) => {
    setItems(items.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  };

  const handleDurationChange = (id: string, mins: number, secs: number) => {
    const totalSecs = Math.max(10, mins * 60 + secs);
    handleItemChange(id, { durationSeconds: totalSecs });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || items.length === 0) return;

    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        targetDurationSeconds,
        items,
        notificationConfig: {
          sound: true,
          soundType: 'chime',
          voice: true,
          notifyBeforeItemEndSeconds: 60,
        },
      },
      initialProgram ? syncFutureEvents : false
    );
    onClose();
  };

  // Preview timeline
  const previewTimeline = computeTimeline(previewStartTime, items);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">
              {initialProgram ? 'Редактирование программы' : 'Создание новой программы'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Название программы *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Совещание отдела или Pitch Deck"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Категория
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Совещания">Совещания</option>
                  <option value="Презентации">Презентации</option>
                  <option value="Тренировки">Тренировки</option>
                  <option value="Конференции">Конференции</option>
                  <option value="Обучение">Обучение</option>
                  <option value="Другое">Другое</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Краткое описание (необязательно)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Цель встречи или регламент"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Target Duration & Allocation Check */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Желаемая общая длительность (минут)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={targetDurationMinutes || ''}
                    onChange={(e) => setTargetDurationMinutes(parseInt(e.target.value, 10) || 0)}
                    placeholder="Например: 60"
                    className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                  <span className="text-xs text-slate-400">
                    {targetDurationMinutes > 0 ? `(${formatDurationTextRu(targetDurationMinutes * 60)})` : 'по сумме пунктов'}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                <div className="text-xs text-slate-400">Сумма всех пунктов:</div>
                <div className="font-mono text-base font-bold text-white">
                  {formatDuration(totalCalculatedSeconds)} ({formatDurationTextRu(totalCalculatedSeconds)})
                </div>
                {targetDurationSeconds && differenceSeconds !== 0 && (
                  <div
                    className={`text-xs font-semibold mt-1 ${
                      differenceSeconds > 0 ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    {differenceSeconds > 0
                      ? `Не распределено: ${formatDurationTextRu(differenceSeconds)}`
                      : `Превышение плана на: ${formatDurationTextRu(Math.abs(differenceSeconds))}`}
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Пункты программы</h3>
                  <span className="text-xs text-slate-400">({items.length})</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить пункт</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((item, index) => {
                  const m = Math.floor(item.durationSeconds / 60);
                  const s = item.durationSeconds % 60;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col md:flex-row items-start md:items-center gap-3"
                    >
                      {/* Order and reorder buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-xs font-bold text-slate-400 w-5">
                          {item.order}.
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === items.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Speaker Inputs */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                        <input
                          type="text"
                          required
                          value={item.title}
                          onChange={(e) => handleItemChange(item.id, { title: e.target.value })}
                          placeholder="Название этапа"
                          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-hidden"
                        />
                        <input
                          type="text"
                          value={item.speaker || ''}
                          onChange={(e) => handleItemChange(item.id, { speaker: e.target.value })}
                          placeholder="Спикер / Ответственный (опция)"
                          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs sm:text-sm text-slate-300 focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Duration Inputs: Min & Sec */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={m}
                            onChange={(e) => handleDurationChange(item.id, parseInt(e.target.value, 10) || 0, s)}
                            className="w-10 bg-transparent text-center text-xs font-mono text-white focus:outline-hidden"
                          />
                          <span className="text-[10px] text-slate-500 uppercase">мин</span>
                          <span className="text-slate-600">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            step="5"
                            value={s}
                            onChange={(e) => handleDurationChange(item.id, m, parseInt(e.target.value, 10) || 0)}
                            className="w-8 bg-transparent text-center text-xs font-mono text-white focus:outline-hidden"
                          />
                          <span className="text-[10px] text-slate-500 uppercase">сек</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length <= 1}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 disabled:opacity-20 transition"
                          title="Удалить пункт"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculated Timeline Preview */}
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  Превью расписания по пунктам (при старте в {previewStartTime}):
                </span>
                <input
                  type="time"
                  value={previewStartTime}
                  onChange={(e) => setPreviewStartTime(e.target.value)}
                  className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {previewTimeline.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs text-slate-400 py-1 border-b border-slate-900"
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono text-slate-500 w-4 inline-block">{item.order}.</span>
                      <span className="text-slate-200">{item.title}</span>
                    </div>
                    <div className="font-mono shrink-0 text-slate-300 text-[11px]">
                      {item.startTimeFormatted} - {item.endTimeFormatted} ({formatDuration(item.durationSeconds)})
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Independence & Future Sync Checkbox (Requirement 22.3) */}
            {initialProgram && (
              <div className="p-3.5 rounded-xl border border-blue-900/40 bg-blue-950/20 text-xs text-slate-300">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncFutureEvents}
                    onChange={(e) => setSyncFutureEvents(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                  <span>
                    <strong>Синхронизировать будущие запланированные события:</strong> обновить названия и длительность пунктов в еще не начавшихся событиях этой программы. (Завершенные и текущие события останутся неизменными).
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4 bg-slate-950">
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
              {initialProgram ? 'Сохранить изменения' : 'Создать программу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
