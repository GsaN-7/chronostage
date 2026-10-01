import React, { useEffect, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTimer } from '../../context/TimerContext';
import { useApp } from '../../context/AppContext';
import { computeTimeline, formatDuration } from '../../utils/time';

export const PresenterMode: React.FC = () => {
  const {
    activeSession,
    isRunning,
    currentItem,
    nextItem,
    currentItemRemainingSeconds,
    totalProgramElapsedSeconds,
    totalProgramRemainingSeconds,
    totalProgramProgressPercent,
    currentItemProgressPercent,
    togglePlayPause,
    skipCurrentItem,
    previousItem,
    restartCurrentItem,
  } = useTimer();

  const { setDisplayMode, settings, updateSettings } = useApp();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipCurrentItem();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        previousItem();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'Escape') {
        setDisplayMode('timer');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, skipCurrentItem, previousItem, setDisplayMode]);

  if (!activeSession || !currentItem) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Сеанс таймера не активен</h2>
        <button
          onClick={() => setDisplayMode('standard')}
          className="px-6 py-3 bg-blue-600 font-semibold rounded-xl text-white"
        >
          Вернуться
        </button>
      </div>
    );
  }

  const baseTimeStr = new Date(activeSession.sessionStartTimestamp).toTimeString().split(' ')[0];
  const calculatedTimeline = computeTimeline(baseTimeStr, activeSession.items);
  const currentCalculated = calculatedTimeline[activeSession.currentItemIndex];
  const nextCalculated = nextItem ? calculatedTimeline[activeSession.currentItemIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans">
      {/* Top Minimal HUD Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs uppercase tracking-widest text-slate-400 font-mono">
              {isRunning ? 'LIVE' : 'PAUSED'}
            </span>
          </div>
          <span className="text-slate-600" aria-hidden="true">|</span>
          <span className="text-sm sm:text-lg font-bold tracking-tight text-slate-200 truncate max-w-md">
            {activeSession.programTitle}
          </span>
        </div>

        {/* Stage HUD Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Звук"
          >
            {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-600" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Полноэкранный режим (F)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setDisplayMode('timer')}
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Выход из режима ведущего (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Focus Center: Current Item + Giant Countdown */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-4">
        {/* Stage Index Pill */}
        <div className="text-sm sm:text-base font-semibold tracking-wider uppercase text-blue-400 mb-2 font-mono">
          Пункт {activeSession.currentItemIndex + 1} из {activeSession.items.length}
        </div>

        {/* Big Stage Title */}
        <h1 className="text-3xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight max-w-5xl leading-tight">
          {currentItem.title}
        </h1>

        {currentItem.speaker && (
          <p className="mt-3 text-lg sm:text-2xl text-slate-300 font-medium">
            Спикер: <span className="text-blue-300 font-semibold">{currentItem.speaker}</span>
          </p>
        )}

        {/* Ultra-Big Countdown */}
        <div
          className={`font-mono text-7xl sm:text-[14vw] font-black tracking-tighter tabular-nums my-4 select-none leading-none ${
            currentItemRemainingSeconds <= 30
              ? 'text-rose-500 animate-pulse'
              : currentItemRemainingSeconds <= 60
              ? 'text-amber-400'
              : 'text-white'
          }`}
        >
          {formatDuration(Math.ceil(currentItemRemainingSeconds))}
        </div>

        {/* Current Stage Time Bounds */}
        <div className="flex items-center gap-4 sm:gap-8 text-sm sm:text-xl text-slate-400 font-mono">
          <span>Начало: <strong className="text-slate-200">{currentCalculated?.startTimeFormatted || '--:--'}</strong></span>
          <span className="text-slate-600">·</span>
          <span>Окончание: <strong className="text-slate-200">{currentCalculated?.endTimeFormatted || '--:--'}</strong></span>
        </div>
      </div>

      {/* Floating Presenter Bottom Dock */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-t border-white/10 pt-4">
        {/* Left: Overall Program Stats */}
        <div className="hidden md:block">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">
            Прогресс программы
          </div>
          <div className="text-sm text-slate-300 font-mono">
            Прошло: <strong className="text-white">{formatDuration(totalProgramElapsedSeconds)}</strong> / Осталось: <strong className="text-white">{formatDuration(totalProgramRemainingSeconds)}</strong>
          </div>
          <div className="mt-2 h-2 w-48 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${totalProgramProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Center: Stage Control Touch Bar */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={previousItem}
            disabled={activeSession.currentItemIndex === 0}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white transition"
            title="Назад (Стрелка влево)"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            onClick={togglePlayPause}
            className={`p-4 sm:p-5 rounded-2xl transition shadow-xl ${
              isRunning ? 'bg-amber-400 text-black hover:bg-amber-300' : 'bg-emerald-400 text-black hover:bg-emerald-300'
            }`}
            title="Пауза / Старт (Пробел)"
          >
            {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-0.5" />}
          </button>

          <button
            onClick={skipCurrentItem}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition"
            title="Вперед (Стрелка вправо)"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {/* Right: Next Stage Card */}
        <div className="text-center md:text-right">
          {nextItem ? (
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold block mb-0.5">
                Следующий этап
              </span>
              <p className="text-base sm:text-xl font-bold text-white truncate">
                {nextItem.title}
              </p>
              <div className="text-xs text-slate-400 font-mono">
                Начало: {nextCalculated?.startTimeFormatted} ({formatDuration(nextItem.durationSeconds)})
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono">
              Заключительный этап программы
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
