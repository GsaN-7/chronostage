/**
 * ChronoStage - Application State Context
 * Manages Programs (templates), Events (calendar instances), History, and App Settings.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  ActiveTab,
  AppSettings,
  DisplayMode,
  EventItemSnapshot,
  Program,
  ScheduledEvent,
  SessionLog,
} from '../types';
import { StorageService } from '../services/storage';
import { calculateTotalDuration, getTodayDateString } from '../utils/time';
import { expandRecurringEventForWindow } from '../utils/recurrence';

interface AppContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;

  programs: Program[];
  createProgram: (program: Omit<Program, 'id' | 'createdAt' | 'updatedAt' | 'calculatedDurationSeconds'>) => Program;
  updateProgram: (
    id: string,
    updates: Partial<Program>,
    syncFutureEvents?: boolean
  ) => void;
  deleteProgram: (id: string) => void;
  duplicateProgram: (id: string) => Program | null;

  events: ScheduledEvent[];
  createEvent: (
    eventData: Omit<ScheduledEvent, 'id' | 'createdAt' | 'updatedAt' | 'calculatedDurationSeconds' | 'status'>
  ) => ScheduledEvent;
  updateEvent: (id: string, updates: Partial<ScheduledEvent>, updateSeries?: boolean) => void;
  cancelEvent: (id: string) => void;
  deleteEvent: (id: string, deleteSeries?: boolean) => void;

  history: SessionLog[];
  addHistoryLog: (log: SessionLog) => void;
  clearHistory: () => void;

  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Active target event for timer launch
  selectedEventForTimer: ScheduledEvent | null;
  launchTimerForEvent: (event: ScheduledEvent, openPresenter?: boolean) => void;
  closeTimerView: () => void;

  refreshData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('standard');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [selectedEventForTimer, setSelectedEventForTimer] = useState<ScheduledEvent | null>(null);

  // Initialize data from local storage
  const loadData = () => {
    setPrograms(StorageService.getPrograms());
    setEvents(StorageService.getEvents());
    setHistory(StorageService.getHistory());
    setSettings(StorageService.getSettings());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync settings theme to document
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Program operations
  const createProgram = (
    programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt' | 'calculatedDurationSeconds'>
  ): Program => {
    const totalDuration = calculateTotalDuration(programData.items);
    const newProgram: Program = {
      ...programData,
      id: `prog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      calculatedDurationSeconds: totalDuration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newProgram, ...programs];
    setPrograms(updated);
    StorageService.savePrograms(updated);
    return newProgram;
  };

  const updateProgram = (
    id: string,
    updates: Partial<Program>,
    syncFutureEvents = false
  ) => {
    let updatedProgram: Program | null = null;
    const newPrograms = programs.map((p) => {
      if (p.id === id) {
        const nextItems = updates.items || p.items;
        const totalDuration = calculateTotalDuration(nextItems);
        updatedProgram = {
          ...p,
          ...updates,
          items: nextItems,
          calculatedDurationSeconds: totalDuration,
          updatedAt: new Date().toISOString(),
        };
        return updatedProgram;
      }
      return p;
    });

    setPrograms(newPrograms);
    StorageService.savePrograms(newPrograms);

    // If requested: update future scheduled events snapshot
    if (syncFutureEvents && updatedProgram) {
      const today = getTodayDateString();
      const updatedEvents = events.map((ev) => {
        if (ev.programId === id && ev.status === 'scheduled' && ev.scheduledDate >= today) {
          const snapshotItems: EventItemSnapshot[] = (updatedProgram as Program).items.map((it) => ({
            id: it.id,
            order: it.order,
            title: it.title,
            durationSeconds: it.durationSeconds,
            description: it.description,
            speaker: it.speaker,
          }));
          return {
            ...ev,
            title: (updatedProgram as Program).title,
            snapshotItems,
            calculatedDurationSeconds: (updatedProgram as Program).calculatedDurationSeconds,
            updatedAt: new Date().toISOString(),
          };
        }
        return ev;
      });
      setEvents(updatedEvents);
      StorageService.saveEvents(updatedEvents);
    }
  };

  const deleteProgram = (id: string) => {
    const updated = programs.filter((p) => p.id !== id);
    setPrograms(updated);
    StorageService.savePrograms(updated);
  };

  const duplicateProgram = (id: string): Program | null => {
    const source = programs.find((p) => p.id === id);
    if (!source) return null;

    const cloned: Program = {
      ...source,
      id: `prog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${source.title} (Копия)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [cloned, ...programs];
    setPrograms(updated);
    StorageService.savePrograms(updated);
    return cloned;
  };

  // Event operations
  const createEvent = (
    eventData: Omit<ScheduledEvent, 'id' | 'createdAt' | 'updatedAt' | 'calculatedDurationSeconds' | 'status'>
  ): ScheduledEvent => {
    const totalDuration = calculateTotalDuration(eventData.snapshotItems);
    const newEvent: ScheduledEvent = {
      ...eventData,
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      calculatedDurationSeconds: totalDuration,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...events, newEvent];
    setEvents(updated);
    StorageService.saveEvents(updated);
    return newEvent;
  };

  const updateEvent = (id: string, updates: Partial<ScheduledEvent>, updateSeries = false) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;

    const updatedEvents = events.map((ev) => {
      // If updating series and this is a sibling or parent with same recurrence parent
      const isTarget = ev.id === id;
      const isSibling =
        updateSeries &&
        target.recurrenceParentId &&
        (ev.recurrenceParentId === target.recurrenceParentId || ev.id === target.recurrenceParentId);

      if (isTarget || isSibling) {
        const nextItems = updates.snapshotItems || ev.snapshotItems;
        const totalDuration = calculateTotalDuration(nextItems);
        return {
          ...ev,
          ...updates,
          snapshotItems: nextItems,
          calculatedDurationSeconds: totalDuration,
          updatedAt: new Date().toISOString(),
        };
      }
      return ev;
    });

    setEvents(updatedEvents);
    StorageService.saveEvents(updatedEvents);
  };

  const cancelEvent = (id: string) => {
    updateEvent(id, { status: 'cancelled' });
  };

  const deleteEvent = (id: string, deleteSeries = false) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;

    let updated: ScheduledEvent[];
    if (deleteSeries && (target.recurrenceParentId || target.recurrenceRule)) {
      const parentId = target.recurrenceParentId || target.id;
      updated = events.filter((e) => e.id !== parentId && e.recurrenceParentId !== parentId);
    } else {
      updated = events.filter((e) => e.id !== id);
    }

    setEvents(updated);
    StorageService.saveEvents(updated);
  };

  // History operations
  const addHistoryLog = (log: SessionLog) => {
    StorageService.addHistoryEntry(log);
    setHistory(StorageService.getHistory());
  };

  const clearHistory = () => {
    StorageService.saveHistory([]);
    setHistory([]);
  };

  // Settings
  const updateSettings = (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  // Timer launch navigation
  const launchTimerForEvent = (event: ScheduledEvent, openPresenter = false) => {
    setSelectedEventForTimer(event);
    setDisplayMode(openPresenter ? 'presenter' : 'timer');
  };

  const closeTimerView = () => {
    setDisplayMode('standard');
    setSelectedEventForTimer(null);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        displayMode,
        setDisplayMode,
        programs,
        createProgram,
        updateProgram,
        deleteProgram,
        duplicateProgram,
        events,
        createEvent,
        updateEvent,
        cancelEvent,
        deleteEvent,
        history,
        addHistoryLog,
        clearHistory,
        settings,
        updateSettings,
        selectedEventForTimer,
        launchTimerForEvent,
        closeTimerView,
        refreshData: loadData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
