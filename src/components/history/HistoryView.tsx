import React, { useState } from 'react';
import { History as HistoryIcon, Clock, CheckCircle, Trash2, ChevronRight, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SessionLog } from '../../types';
import { formatDateRu, formatDuration } from '../../utils/time';

export const HistoryView: React.FC = () => {
  const { history, clearHistory } = useApp();
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            История мероприятий
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Архив проведенных сессий и фактическая статистика времени по этапам
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Очистить всю историю мероприятий?')) {
                clearHistory();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-850 bg-slate-900/30 text-slate-400">
          <HistoryIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">История пока пуста</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            После того, как вы запустите и завершите мероприятие с таймером, здесь отобразится подробный отчет о тайминге каждого этапа.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((log) => {
            const diffSeconds = log.actualDurationSeconds - log.plannedDurationSeconds;
            const diffSign = diffSeconds > 0 ? '+' : '';

            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white truncate">
                      {log.programTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{formatDateRu(log.scheduledDate)} в {log.scheduledTime.slice(0, 5)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{log.items.length} этапов</span>
                      {log.adjustmentsCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400 font-mono">
                            {log.adjustmentsCount} ручн. корр.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">
                      Факт: <strong className="font-mono text-slate-200">{formatDuration(log.actualDurationSeconds)}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      План: {formatDuration(log.plannedDurationSeconds)} ({diffSign}{formatDuration(Math.abs(diffSeconds))})
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Отчет о проведении
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedLog.programTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs">
                <div>
                  <span className="text-slate-400 block">Запланировано:</span>
                  <strong className="font-mono text-slate-200 text-sm">
                    {formatDuration(selectedLog.plannedDurationSeconds)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Фактическое время:</span>
                  <strong className="font-mono text-emerald-400 text-sm">
                    {formatDuration(selectedLog.actualDurationSeconds)}
                  </strong>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Фактический тайминг по этапам:
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedLog.items.map((it) => (
                    <div
                      key={it.itemId}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80"
                    >
                      <div className="truncate pr-2">
                        <span className="font-mono text-slate-500 w-5 inline-block">{it.order}.</span>
                        <span className={`font-medium ${it.skipped ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                          {it.title}
                        </span>
                        {it.skipped && <span className="text-rose-400 text-[10px] ml-2">(пропущен)</span>}
                      </div>
                      <div className="font-mono text-[11px] shrink-0 text-right">
                        <span className="text-slate-200">{formatDuration(it.actualSeconds)}</span>
                        <span className="text-slate-500 ml-1.5">/ {formatDuration(it.plannedSeconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 px-6 py-4 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
