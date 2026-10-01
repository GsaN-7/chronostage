import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Plus,
  Minus,
  CheckCircle2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Maximize2,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
} from 'lucide-react';
import { useTimer } from '../../context/TimerContext';
import { useApp } from '../../context/AppContext';
import { computeTimeline, formatDuration } from '../../utils/time';

export const ActiveTimerView: React.FC = () => {
  const {
    activeSession,
    isRunning,
    isPaused,
    currentItem,
    nextItem,
    currentItemRemainingSeconds,
    currentItemElapsedSeconds,
    currentItemPlannedSeconds,
    totalProgramElapsedSeconds,
    totalProgramRemainingSeconds,
    totalProgramPlannedSeconds,
    totalProgramProgressPercent,
    currentItemProgressPercent,
    togglePlayPause,
    adjustCurrentItemTime,
    restartCurrentItem,
    skipCurrentItem,
    previousItem,
    finishCurrentSession,
  } = useTimer();

  const { setDisplayMode, settings, updateSettings, closeTimerView } = useApp();
  const [showTimeline, setShowTimeline] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  if (!activeSession || !currentItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-md w-full">
          <Clock className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Нет активного сеанса</h2>
          <p className="text-sm text-slate-400 mb-6">
            Выберите запланированное мероприятие в разделе «Сегодня» или создайте быстрый запуск из «Программ».
          </p>
          <button
            onClick={closeTimerView}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 font-semibold text-white rounded-xl transition"
          >
            Вернуться в меню
          </button>
        </div>
      </div>
    );
  }

  // Calculate dynamic start/end times based on active session start
  const baseTimeStr = new Date(activeSession.sessionStartTimestamp).toTimeString().split(' ')[0];
  const calculatedTimeline = computeTimeline(baseTimeStr, activeSession.items);
  const currentCalculated = calculatedTimeline[activeSession.currentItemIndex];
  const nextCalculated = nextItem ? calculatedTimeline[activeSession.currentItemIndex + 1] : null;

  const itemsLeftCount = activeSession.items.length - (activeSession.currentItemIndex + 1);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-24 md:pb-12 bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Session Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                {activeSession.programTitle}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Пункт {activeSession.currentItemIndex + 1} из {activeSession.items.length}</span>
                <span aria-hidden="true">·</span>
                <span>Осталось этапов: {itemsLeftCount}</span>
              </div>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`p-2 rounded-lg border transition ${
                settings.soundEnabled
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                  : 'border-slate-800 bg-slate-900 text-slate-500'
              }`}
              title={settings.soundEnabled ? 'Звук включен' : 'Звук выключен'}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => updateSettings({ speechEnabled: !settings.speechEnabled })}
              className={`p-2 rounded-lg border transition ${
                settings.speechEnabled
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-800 bg-slate-900 text-slate-500'
              }`}
              title={settings.speechEnabled ? 'Голосовые подсказки включены' : 'Голос выключен'}
            >
              {settings.speechEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setDisplayMode('presenter')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-700 transition"
              title="Открыть режим ведущего для проектора"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Presenter Mode</span>
            </button>

            <button
              onClick={closeTimerView}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Свернуть таймер"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Focus Zone */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-6 max-w-4xl mx-auto w-full">
        {/* Stage Name */}
        <div className="text-center mb-2">
          <div className="text-xs uppercase tracking-widest font-semibold text-blue-400 mb-1">
            Текущий этап №{activeSession.currentItemIndex + 1}
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight break-words max-w-2xl px-2">
            {currentItem.title}
          </h2>
          {currentItem.speaker && (
            <p className="mt-2 text-sm sm:text-base text-slate-300 font-medium">
              Спикер / Ответственный: <span className="text-blue-300">{currentItem.speaker}</span>
            </p>
          )}
        </div>

        {/* Big Remaining Countdown */}
        <div className="my-4 sm:my-6 flex flex-col items-center">
          <div
            className={`font-mono text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tight tabular-nums select-none ${
              currentItemRemainingSeconds <= 30
                ? 'text-rose-400 animate-pulse'
                : currentItemRemainingSeconds <= 60
                ? 'text-amber-400'
                : 'text-white'
            }`}
          >
            {formatDuration(Math.ceil(currentItemRemainingSeconds))}
          </div>

          {/* Current Stage Time Bounds */}
          <div className="flex items-center gap-3 sm:gap-6 mt-3 text-xs sm:text-sm text-slate-400">
            <span>Начало: <strong className="text-slate-200">{currentCalculated?.startTimeFormatted || '--:--'}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Окончание: <strong className="text-slate-200">{currentCalculated?.endTimeFormatted || '--:--'}</strong></span>
            <span aria-hidden="true">·</span>
            <span>План: <strong className="text-slate-200">{formatDuration(currentItemPlannedSeconds)}</strong></span>
          </div>

          {/* Current Item Progress Bar */}
          <div className="w-full max-w-lg mt-4 h-2 bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                currentItemRemainingSeconds <= 30 ? 'bg-rose-500' : 'bg-blue-500'
              }`}
              style={{ width: `${currentItemProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Time Adjustment Buttons (-5, -1, +1, +5) */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6">
          <button
            onClick={() => adjustCurrentItemTime(-300)}
            disabled={currentItemRemainingSeconds <= 310}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
          >
            −5 мин
          </button>
          <button
            onClick={() => adjustCurrentItemTime(-60)}
            disabled={currentItemRemainingSeconds <= 70}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
          >
            −1 мин
          </button>
          <button
            onClick={() => adjustCurrentItemTime(60)}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            +1 мин
          </button>
          <button
            onClick={() => adjustCurrentItemTime(300)}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            +5 мин
          </button>
        </div>

        {/* Primary Playback Controls */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6">
          <button
            onClick={previousItem}
            disabled={activeSession.currentItemIndex === 0}
            className="p-3 sm:p-3.5 rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            title="Предыдущий пункт"
          >
            <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={restartCurrentItem}
            className="p-3 sm:p-3.5 rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Перезапустить текущий пункт"
          >
            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={togglePlayPause}
            className={`p-4 sm:p-5 rounded-2xl font-bold transition shadow-lg flex items-center justify-center ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
            title={isRunning ? 'Пауза' : 'Продолжить'}
          >
            {isRunning ? (
              <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
            ) : (
              <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={skipCurrentItem}
            className="p-3 sm:p-3.5 rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Пропустить текущий пункт (перейти к следующему)"
          >
            <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={() => setConfirmFinish(true)}
            className="p-3 sm:p-3.5 rounded-2xl border border-rose-900/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 transition"
            title="Завершить программу досрочно"
          >
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Next Item Card */}
        {nextItem && (
          <div className="w-full max-w-md p-3.5 sm:p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xs flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Следующий этап
              </span>
              <p className="text-sm sm:text-base font-bold text-slate-100 truncate">
                {nextItem.title}
              </p>
              {nextItem.speaker && (
                <span className="text-xs text-slate-400 truncate block">
                  Спикер: {nextItem.speaker}
                </span>
              )}
            </div>
            <div className="text-right shrink-0 border-l border-slate-800 pl-3">
              <div className="text-xs text-slate-400">Начало: <strong className="text-slate-200">{nextCalculated?.startTimeFormatted || '--:--'}</strong></div>
              <div className="text-xs font-mono text-blue-400">{formatDuration(nextItem.durationSeconds)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Overall Program Progress Bar */}
      <div className="border-t border-slate-800/80 bg-slate-900/60 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <div className="flex items-center gap-2">
              <span>Прошло: <strong className="text-slate-200 font-mono">{formatDuration(totalProgramElapsedSeconds)}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Осталось всего: <strong className="text-slate-200 font-mono">{formatDuration(totalProgramRemainingSeconds)}</strong></span>
            </div>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
            >
              <span>{showTimeline ? 'Скрыть список' : 'План программы'}</span>
              {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
              style={{ width: `${totalProgramProgressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Общая продолжительность: {formatDuration(totalProgramPlannedSeconds)}</span>
            <span className="font-semibold text-slate-300">{totalProgramProgressPercent}% выполнено</span>
          </div>

          {/* Collapsible Timeline Detail */}
          {showTimeline && (
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 max-h-60 overflow-y-auto pr-1">
              {calculatedTimeline.map((item, idx) => {
                const isPast = idx < activeSession.currentItemIndex;
                const isCurrent = idx === activeSession.currentItemIndex;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition ${
                      isCurrent
                        ? 'bg-blue-600/20 border border-blue-500/30 text-white font-semibold'
                        : isPast
                        ? 'text-slate-400 line-through opacity-60'
                        : 'text-slate-300 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-slate-400 w-5">{item.order}.</span>
                      <span className="truncate">{item.title}</span>
                      {item.speaker && <span className="text-slate-400">({item.speaker})</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                      <span>{item.startTimeFormatted} - {item.endTimeFormatted}</span>
                      <span className="text-slate-400">({formatDuration(item.durationSeconds)})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Finish Modal */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Завершить программу?</h3>
            </div>
            <p className="text-sm text-slate-300 mb-6">
              Вы хотите завершить текущую программу? Фактическое время и статистика выполнения будут сохранены в «Истории».
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmFinish(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 transition"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setConfirmFinish(false);
                  finishCurrentSession();
                  closeTimerView();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition"
              >
                Завершить сейчас
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
