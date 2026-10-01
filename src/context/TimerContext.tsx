/**
 * ChronoStage - Core Timer Engine Context
 * Drift-free execution based on absolute timestamps.
 * Recovers seamlessly from background sleep, tab suspension, and page reloads.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  CompletedItemStat,
  EventItemSnapshot,
  ScheduledEvent,
  SessionLog,
  TimeAdjustment,
  TimerSession,
} from '../types';
import { StorageService } from '../services/storage';
import { useApp } from './AppContext';
import { playSound, speakText } from '../utils/audio';
import { sendNotification } from '../utils/notifications';
import { releaseScreenWakeLock, requestScreenWakeLock } from '../utils/wakelock';
import { calculateTotalDuration, formatDuration } from '../utils/time';

interface TimerContextType {
  activeSession: TimerSession | null;
  isRunning: boolean;
  isPaused: boolean;
  currentItem: EventItemSnapshot | null;
  nextItem: EventItemSnapshot | null;
  currentItemRemainingSeconds: number;
  currentItemElapsedSeconds: number;
  currentItemPlannedSeconds: number;
  totalProgramElapsedSeconds: number;
  totalProgramRemainingSeconds: number;
  totalProgramPlannedSeconds: number;
  totalProgramProgressPercent: number;
  currentItemProgressPercent: number;

  // Actions
  startEventTimer: (event: ScheduledEvent) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  togglePlayPause: () => void;
  adjustCurrentItemTime: (deltaSeconds: number) => void;
  restartCurrentItem: () => void;
  skipCurrentItem: () => void;
  previousItem: () => void;
  finishCurrentSession: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, addHistoryLog, updateEvent } = useApp();
  const [activeSession, setActiveSession] = useState<TimerSession | null>(() => {
    return StorageService.getActiveSession();
  });

  // Real-time ticking state
  const [tick, setTick] = useState(0);
  const warnedItemRef = useRef<string | null>(null);
  const sessionRef = useRef<TimerSession | null>(activeSession);
  sessionRef.current = activeSession;

  // Keep screen awake if setting enabled and running
  useEffect(() => {
    if (activeSession && activeSession.status === 'running' && settings.keepScreenAwake) {
      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }
    return () => {
      releaseScreenWakeLock();
    };
  }, [activeSession?.status, settings.keepScreenAwake]);

  // Synchronize active session to local storage
  const updateSessionState = useCallback((newSession: TimerSession | null) => {
    setActiveSession(newSession);
    StorageService.saveActiveSession(newSession);
  }, []);

  // Finish session helper
  const finalizeSession = useCallback(
    (session: TimerSession) => {
      const now = Date.now();
      const actualDuration = Math.round((now - session.sessionStartTimestamp) / 1000);
      const plannedDuration = calculateTotalDuration(session.items);

      // Record any unrecorded items as skipped or finished
      const stats = [...session.completedItemStats];
      const finishedItemIds = new Set(stats.map((s) => s.itemId));

      session.items.forEach((item, index) => {
        if (!finishedItemIds.has(item.id)) {
          if (index < session.currentItemIndex) {
            stats.push({
              itemId: item.id,
              order: item.order,
              title: item.title,
              plannedSeconds: item.durationSeconds,
              actualSeconds: item.durationSeconds,
              skipped: session.skippedItemIds.includes(item.id),
            });
          } else if (index === session.currentItemIndex) {
            const elapsed = Math.round((now - session.itemStartTimestamp) / 1000) + session.itemElapsedBeforePauseSeconds;
            stats.push({
              itemId: item.id,
              order: item.order,
              title: item.title,
              plannedSeconds: session.itemPlannedDurationSeconds,
              actualSeconds: Math.max(0, elapsed),
              skipped: session.skippedItemIds.includes(item.id),
            });
          } else {
            stats.push({
              itemId: item.id,
              order: item.order,
              title: item.title,
              plannedSeconds: item.durationSeconds,
              actualSeconds: 0,
              skipped: true,
            });
          }
        }
      });

      const log: SessionLog = {
        id: `log-${Date.now()}`,
        eventId: session.eventId,
        programTitle: session.programTitle,
        scheduledDate: new Date(session.sessionStartTimestamp).toISOString().split('T')[0],
        scheduledTime: new Date(session.sessionStartTimestamp).toTimeString().split(' ')[0],
        actualStartTime: session.sessionStartTimestamp,
        actualEndTime: now,
        plannedDurationSeconds: plannedDuration,
        actualDurationSeconds: actualDuration,
        items: stats,
        adjustmentsCount: session.adjustments.length,
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      addHistoryLog(log);

      // Update event status to completed
      updateEvent(session.eventId, {
        status: 'completed',
        actualStartTime: session.sessionStartTimestamp,
        actualEndTime: now,
        actualDurationSeconds: actualDuration,
      });

      // Clear active session
      updateSessionState(null);

      // Sound and speech signal
      if (settings.soundEnabled) {
        playSound('gong', settings.soundVolume);
      }
      if (settings.speechEnabled) {
        speakText('Программа успешно завершена', settings.speechVoiceName);
      }
      if (settings.notificationsEnabled) {
        sendNotification('Программа завершена!', {
          body: `Мероприятие «${session.programTitle}» успешно подошло к концу.`,
        });
      }
    },
    [addHistoryLog, updateEvent, updateSessionState, settings]
  );

  // Advance to next item
  const advanceToNextItem = useCallback(
    (currentSession: TimerSession, wasSkipped = false) => {
      const now = Date.now();
      const currentItem = currentSession.items[currentSession.currentItemIndex];

      const itemElapsed =
        Math.round((now - currentSession.itemStartTimestamp) / 1000) +
        currentSession.itemElapsedBeforePauseSeconds;

      const completedStat: CompletedItemStat = {
        itemId: currentItem.id,
        order: currentItem.order,
        title: currentItem.title,
        plannedSeconds: currentSession.itemPlannedDurationSeconds,
        actualSeconds: wasSkipped ? 0 : Math.max(0, itemElapsed),
        skipped: wasSkipped,
      };

      const nextIndex = currentSession.currentItemIndex + 1;

      if (nextIndex >= currentSession.items.length) {
        // End of program
        const finalSession: TimerSession = {
          ...currentSession,
          completedItemStats: [...currentSession.completedItemStats, completedStat],
        };
        finalizeSession(finalSession);
        return;
      }

      const nextItem = currentSession.items[nextIndex];
      const updatedSession: TimerSession = {
        ...currentSession,
        currentItemIndex: nextIndex,
        itemStartTimestamp: now,
        itemPlannedDurationSeconds: nextItem.durationSeconds,
        itemElapsedBeforePauseSeconds: 0,
        pauseStartTimestamp: undefined,
        status: 'running',
        completedItemStats: [...currentSession.completedItemStats, completedStat],
        lastTickTimestamp: now,
      };

      updateSessionState(updatedSession);
      warnedItemRef.current = null;

      // Signals for item transition
      if (settings.soundEnabled) {
        playSound(settings.soundType, settings.soundVolume);
      }
      if (settings.speechEnabled) {
        const speechMsg = `Следующий пункт: ${nextItem.title}`;
        speakText(speechMsg, settings.speechVoiceName);
      }
      if (settings.notificationsEnabled) {
        sendNotification(`Этап: ${nextItem.title}`, {
          body: `Начался пункт №${nextItem.order} (${formatDuration(nextItem.durationSeconds)})`,
        });
      }
    },
    [finalizeSession, updateSessionState, settings]
  );

  // Primary absolute-time ticker loop (runs every 250ms)
  useEffect(() => {
    const interval = setInterval(() => {
      const session = sessionRef.current;
      if (!session) return;

      if (session.status === 'running') {
        const now = Date.now();
        const elapsedSinceStart = (now - session.itemStartTimestamp) / 1000;
        const totalElapsedInItem = elapsedSinceStart + session.itemElapsedBeforePauseSeconds;
        const remaining = session.itemPlannedDurationSeconds - totalElapsedInItem;

        // Pre-warning voice / notification check (e.g. at 60s remaining)
        const warnThreshold = 60;
        const currentItem = session.items[session.currentItemIndex];
        if (
          currentItem &&
          remaining <= warnThreshold &&
          remaining > 0 &&
          session.itemPlannedDurationSeconds > warnThreshold &&
          warnedItemRef.current !== currentItem.id
        ) {
          warnedItemRef.current = currentItem.id;
          const nextItem = session.items[session.currentItemIndex + 1];
          if (settings.speechEnabled) {
            const nextPart = nextItem ? `Следующий пункт — ${nextItem.title}` : 'Это заключительный пункт.';
            speakText(`Заканчивается ${currentItem.title}. ${nextPart}`, settings.speechVoiceName);
          }
          if (settings.soundEnabled) {
            playSound('beep', settings.soundVolume * 0.7);
          }
        }

        // Automatic item transition when time expires
        if (remaining <= 0) {
          advanceToNextItem(session, false);
          return;
        }

        setTick((prev) => (prev + 1) % 10000);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [advanceToNextItem, settings]);

  // Tab visibility reconciliation (smooth wake-up from background sleep)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const session = sessionRef.current;
        if (!session || session.status !== 'running') return;

        const now = Date.now();
        const totalElapsedInItem = (now - session.itemStartTimestamp) / 1000 + session.itemElapsedBeforePauseSeconds;
        if (totalElapsedInItem >= session.itemPlannedDurationSeconds) {
          advanceToNextItem(session, false);
        } else {
          setTick((prev) => (prev + 1) % 10000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [advanceToNextItem]);

  // Start timer for a scheduled event
  const startEventTimer = useCallback(
    (event: ScheduledEvent) => {
      const now = Date.now();
      const items = event.snapshotItems.length > 0 ? event.snapshotItems : [
        { id: 'default-item', order: 1, title: 'Основное время', durationSeconds: 60 * 60 }
      ];

      const initialSession: TimerSession = {
        sessionId: `sess-${now}`,
        eventId: event.id,
        programTitle: event.title,
        items,
        currentItemIndex: 0,
        status: 'running',
        sessionStartTimestamp: now,
        itemStartTimestamp: now,
        itemPlannedDurationSeconds: items[0].durationSeconds,
        itemElapsedBeforePauseSeconds: 0,
        pauseStartTimestamp: undefined,
        adjustments: [],
        skippedItemIds: [],
        completedItemStats: [],
        lastTickTimestamp: now,
      };

      updateSessionState(initialSession);
      updateEvent(event.id, { status: 'running', actualStartTime: now });

      if (settings.soundEnabled) {
        playSound('bell', settings.soundVolume);
      }
      if (settings.speechEnabled) {
        speakText(`Запуск программы ${event.title}. Первый пункт: ${items[0].title}`, settings.speechVoiceName);
      }
    },
    [updateSessionState, updateEvent, settings]
  );

  const pauseTimer = useCallback(() => {
    if (!activeSession || activeSession.status !== 'running') return;
    const now = Date.now();
    const currentRunElapsed = Math.max(0, (now - activeSession.itemStartTimestamp) / 1000);

    const pausedSession: TimerSession = {
      ...activeSession,
      status: 'paused',
      pauseStartTimestamp: now,
      itemElapsedBeforePauseSeconds: activeSession.itemElapsedBeforePauseSeconds + currentRunElapsed,
      lastTickTimestamp: now,
    };
    updateSessionState(pausedSession);
  }, [activeSession, updateSessionState]);

  const resumeTimer = useCallback(() => {
    if (!activeSession || activeSession.status !== 'paused') return;
    const now = Date.now();

    const runningSession: TimerSession = {
      ...activeSession,
      status: 'running',
      itemStartTimestamp: now,
      pauseStartTimestamp: undefined,
      lastTickTimestamp: now,
    };
    updateSessionState(runningSession);
  }, [activeSession, updateSessionState]);

  const togglePlayPause = useCallback(() => {
    if (!activeSession) return;
    if (activeSession.status === 'running') {
      pauseTimer();
    } else if (activeSession.status === 'paused') {
      resumeTimer();
    }
  }, [activeSession, pauseTimer, resumeTimer]);

  const adjustCurrentItemTime = useCallback(
    (deltaSeconds: number) => {
      if (!activeSession) return;
      const currentItem = activeSession.items[activeSession.currentItemIndex];
      const newPlanned = Math.max(10, activeSession.itemPlannedDurationSeconds + deltaSeconds);

      const adj: TimeAdjustment = {
        id: `adj-${Date.now()}`,
        itemId: currentItem.id,
        deltaSeconds,
        timestamp: Date.now(),
      };

      const updatedSession: TimerSession = {
        ...activeSession,
        itemPlannedDurationSeconds: newPlanned,
        adjustments: [...activeSession.adjustments, adj],
        lastTickTimestamp: Date.now(),
      };

      updateSessionState(updatedSession);
      if (settings.soundEnabled) {
        playSound('beep', settings.soundVolume * 0.5);
      }
    },
    [activeSession, updateSessionState, settings]
  );

  const restartCurrentItem = useCallback(() => {
    if (!activeSession) return;
    const now = Date.now();
    const currentItem = activeSession.items[activeSession.currentItemIndex];

    const updatedSession: TimerSession = {
      ...activeSession,
      itemStartTimestamp: now,
      itemElapsedBeforePauseSeconds: 0,
      pauseStartTimestamp: undefined,
      itemPlannedDurationSeconds: currentItem.durationSeconds,
      status: 'running',
      lastTickTimestamp: now,
    };

    updateSessionState(updatedSession);
  }, [activeSession, updateSessionState]);

  const skipCurrentItem = useCallback(() => {
    if (!activeSession) return;
    const currentItem = activeSession.items[activeSession.currentItemIndex];
    const skippedSession: TimerSession = {
      ...activeSession,
      skippedItemIds: [...activeSession.skippedItemIds, currentItem.id],
    };
    advanceToNextItem(skippedSession, true);
  }, [activeSession, advanceToNextItem]);

  const previousItem = useCallback(() => {
    if (!activeSession || activeSession.currentItemIndex <= 0) return;
    const now = Date.now();
    const prevIndex = activeSession.currentItemIndex - 1;
    const prevItem = activeSession.items[prevIndex];

    // Remove the last completed item stat
    const nextCompletedStats = activeSession.completedItemStats.slice(0, prevIndex);

    const updatedSession: TimerSession = {
      ...activeSession,
      currentItemIndex: prevIndex,
      itemStartTimestamp: now,
      itemPlannedDurationSeconds: prevItem.durationSeconds,
      itemElapsedBeforePauseSeconds: 0,
      pauseStartTimestamp: undefined,
      status: 'running',
      completedItemStats: nextCompletedStats,
      lastTickTimestamp: now,
    };

    updateSessionState(updatedSession);
  }, [activeSession, updateSessionState]);

  const finishCurrentSession = useCallback(() => {
    if (!activeSession) return;
    finalizeSession(activeSession);
  }, [activeSession, finalizeSession]);

  // Derived real-time metrics
  const now = Date.now();
  const currentItem = activeSession?.items[activeSession.currentItemIndex] || null;
  const nextItem =
    activeSession && activeSession.currentItemIndex + 1 < activeSession.items.length
      ? activeSession.items[activeSession.currentItemIndex + 1]
      : null;

  let currentItemElapsedSeconds = 0;
  let currentItemPlannedSeconds = activeSession?.itemPlannedDurationSeconds || 0;
  let currentItemRemainingSeconds = 0;

  if (activeSession) {
    if (activeSession.status === 'running') {
      const runningMs = now - activeSession.itemStartTimestamp;
      currentItemElapsedSeconds = Math.max(0, runningMs / 1000 + activeSession.itemElapsedBeforePauseSeconds);
    } else {
      currentItemElapsedSeconds = activeSession.itemElapsedBeforePauseSeconds;
    }
    currentItemRemainingSeconds = Math.max(0, currentItemPlannedSeconds - currentItemElapsedSeconds);
  }

  // Program total progress
  let totalProgramElapsedSeconds = 0;
  let totalProgramPlannedSeconds = 0;
  let totalProgramRemainingSeconds = 0;
  let totalProgramProgressPercent = 0;
  let currentItemProgressPercent = 0;

  if (activeSession) {
    totalProgramPlannedSeconds = calculateTotalDuration(activeSession.items);

    // Sum previous completed items
    const completedSeconds = activeSession.completedItemStats.reduce((acc, it) => acc + it.actualSeconds, 0);
    totalProgramElapsedSeconds = completedSeconds + currentItemElapsedSeconds;

    totalProgramRemainingSeconds = Math.max(0, totalProgramPlannedSeconds - totalProgramElapsedSeconds);
    totalProgramProgressPercent = totalProgramPlannedSeconds > 0
      ? Math.min(100, Math.round((totalProgramElapsedSeconds / totalProgramPlannedSeconds) * 100))
      : 0;

    currentItemProgressPercent = currentItemPlannedSeconds > 0
      ? Math.min(100, Math.round((currentItemElapsedSeconds / currentItemPlannedSeconds) * 100))
      : 0;
  }

  return (
    <TimerContext.Provider
      value={{
        activeSession,
        isRunning: activeSession?.status === 'running',
        isPaused: activeSession?.status === 'paused',
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
        startEventTimer,
        pauseTimer,
        resumeTimer,
        togglePlayPause,
        adjustCurrentItemTime,
        restartCurrentItem,
        skipCurrentItem,
        previousItem,
        finishCurrentSession,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
