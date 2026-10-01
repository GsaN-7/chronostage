/**
 * ChronoStage - LocalStorage Persistence Service
 * High-performance, offline-first local data store with initial seed data.
 */

import { AppSettings, Program, ScheduledEvent, SessionLog, TimerSession } from '../types';
import { calculateTotalDuration, getTodayDateString } from '../utils/time';

const STORAGE_KEYS = {
  PROGRAMS: 'chronostage_programs_v1',
  EVENTS: 'chronostage_events_v1',
  ACTIVE_SESSION: 'chronostage_active_session_v1',
  HISTORY: 'chronostage_history_v1',
  SETTINGS: 'chronostage_settings_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  soundType: 'chime',
  soundVolume: 0.8,
  speechEnabled: true,
  notificationsEnabled: true,
  leadWarningMinutes: 10,
  keepScreenAwake: true,
  theme: 'dark',
};

const SEED_PROGRAMS: Program[] = [
  {
    id: 'prog-weekly-meeting',
    title: 'Еженедельное совещание отдела',
    description: 'Регулярная синхронизация команды, отчеты по спринтам и планирование задач.',
    category: 'Совещания',
    items: [
      { id: 'item-1', order: 1, title: 'Вступление и повестка', durationSeconds: 5 * 60, speaker: 'Модератор' },
      { id: 'item-2', order: 2, title: 'Отчеты команд по проектам', durationSeconds: 20 * 60, speaker: 'Лиды направлений' },
      { id: 'item-3', order: 3, title: 'Обсуждение блокеров и вопросов', durationSeconds: 30 * 60 },
      { id: 'item-4', order: 4, title: 'Планирование на следующую неделю', durationSeconds: 20 * 60 },
      { id: 'item-5', order: 5, title: 'Заключение и договоренности', durationSeconds: 5 * 60, speaker: 'Модератор' },
    ],
    targetDurationSeconds: 80 * 60,
    calculatedDurationSeconds: 80 * 60,
    notificationConfig: {
      sound: true,
      soundType: 'chime',
      voice: true,
      notifyBeforeItemEndSeconds: 60,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prog-project-pitch',
    title: 'Презентация и питч проекта',
    description: 'Демонстрация продукта для инвесторов и партнеров с блоком Q&A.',
    category: 'Презентации',
    items: [
      { id: 'pitch-1', order: 1, title: 'Вводное слово и контекст проблемы', durationSeconds: 5 * 60 },
      { id: 'pitch-2', order: 2, title: 'Презентация решения и продукта', durationSeconds: 15 * 60, speaker: 'Спикер' },
      { id: 'pitch-3', order: 3, title: 'Живая демонстрация (Live Demo)', durationSeconds: 10 * 60 },
      { id: 'pitch-4', order: 4, title: 'Вопросы и ответы (Q&A)', durationSeconds: 10 * 60 },
      { id: 'pitch-5', order: 5, title: 'Резюме и следующие шаги', durationSeconds: 5 * 60 },
    ],
    targetDurationSeconds: 45 * 60,
    calculatedDurationSeconds: 45 * 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prog-hiit-workout',
    title: 'Интервальная тренировка HIIT',
    description: 'Интенсивный круговой тренинг со сменой темпа и короткими перерывами.',
    category: 'Тренировки',
    items: [
      { id: 'hiit-1', order: 1, title: 'Суставная разминка и разогрев', durationSeconds: 5 * 60 },
      { id: 'hiit-2', order: 2, title: 'Раунд 1: Кардио и прыжки', durationSeconds: 4 * 60 },
      { id: 'hiit-3', order: 3, title: 'Короткий отдых и гидратация', durationSeconds: 90 },
      { id: 'hiit-4', order: 4, title: 'Раунд 2: Силовая работа', durationSeconds: 4 * 60 },
      { id: 'hiit-5', order: 5, title: 'Короткий отдых', durationSeconds: 90 },
      { id: 'hiit-6', order: 6, title: 'Раунд 3: Кор и пресс', durationSeconds: 4 * 60 },
      { id: 'hiit-7', order: 7, title: 'Заминка и статическая растяжка', durationSeconds: 5 * 60 },
    ],
    targetDurationSeconds: 25 * 60,
    calculatedDurationSeconds: 25 * 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prog-conference-session',
    title: 'Конференция: Секция докладов',
    description: 'Двухчасовая секция с несколькими спикерами и кофе-брейком.',
    category: 'Конференции',
    items: [
      { id: 'conf-1', order: 1, title: 'Приветствие и регламент секции', durationSeconds: 5 * 60, speaker: 'Ведущий' },
      { id: 'conf-2', order: 2, title: 'Доклад №1: Архитектура систем', durationSeconds: 25 * 60, speaker: 'Александр В.' },
      { id: 'conf-3', order: 3, title: 'Обсуждение и вопросы к докладу №1', durationSeconds: 10 * 60 },
      { id: 'conf-4', order: 4, title: 'Кофе-брейк и нетворкинг', durationSeconds: 15 * 60 },
      { id: 'conf-5', order: 5, title: 'Доклад №2: Опыт внедрения', durationSeconds: 30 * 60, speaker: 'Елена К.' },
      { id: 'conf-6', order: 6, title: 'Панельная дискуссия и закрытие секции', durationSeconds: 35 * 60 },
    ],
    targetDurationSeconds: 120 * 60,
    calculatedDurationSeconds: 120 * 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function generateSeedEvents(): ScheduledEvent[] {
  const today = getTodayDateString();
  const meetingTemplate = SEED_PROGRAMS[0];
  const pitchTemplate = SEED_PROGRAMS[1];

  return [
    {
      id: 'event-today-meeting',
      programId: meetingTemplate.id,
      title: meetingTemplate.title,
      description: meetingTemplate.description,
      category: meetingTemplate.category,
      scheduledDate: today,
      scheduledTime: '10:00:00',
      targetDurationSeconds: meetingTemplate.targetDurationSeconds,
      calculatedDurationSeconds: meetingTemplate.calculatedDurationSeconds,
      status: 'scheduled',
      snapshotItems: meetingTemplate.items.map((it) => ({ ...it })),
      recurrenceRule: {
        frequency: 'weekly',
        daysOfWeek: [1], // Monday
        startDate: today,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'event-today-pitch',
      programId: pitchTemplate.id,
      title: pitchTemplate.title,
      description: pitchTemplate.description,
      category: pitchTemplate.category,
      scheduledDate: today,
      scheduledTime: '15:30:00',
      targetDurationSeconds: pitchTemplate.targetDurationSeconds,
      calculatedDurationSeconds: pitchTemplate.calculatedDurationSeconds,
      status: 'scheduled',
      snapshotItems: pitchTemplate.items.map((it) => ({ ...it })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export const StorageService = {
  getPrograms(): Program[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRAMS);
      if (!data) {
        this.savePrograms(SEED_PROGRAMS);
        return SEED_PROGRAMS;
      }
      return JSON.parse(data);
    } catch {
      return SEED_PROGRAMS;
    }
  },

  savePrograms(programs: Program[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(programs));
    } catch (err) {
      console.error('Failed to save programs to localStorage', err);
    }
  },

  getEvents(): ScheduledEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (!data) {
        const initialEvents = generateSeedEvents();
        this.saveEvents(initialEvents);
        return initialEvents;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveEvents(events: ScheduledEvent[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch (err) {
      console.error('Failed to save events to localStorage', err);
    }
  },

  getActiveSession(): TimerSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveActiveSession(session: TimerSession | null): void {
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      }
    } catch (err) {
      console.error('Failed to save active session', err);
    }
  },

  getHistory(): SessionLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveHistory(history: SessionLog[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (err) {
      console.error('Failed to save history', err);
    }
  },

  addHistoryEntry(log: SessionLog): void {
    const list = this.getHistory();
    list.unshift(log);
    this.saveHistory(list);
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings', err);
    }
  },

  exportAllDataJson(): string {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        programs: this.getPrograms(),
        events: this.getEvents(),
        history: this.getHistory(),
        settings: this.getSettings(),
      },
      null,
      2
    );
  },

  importAllDataJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.programs) this.savePrograms(data.programs);
      if (data.events) this.saveEvents(data.events);
      if (data.history) this.saveHistory(data.history);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (err) {
      console.error('Failed to import JSON data:', err);
      return false;
    }
  },

  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.PROGRAMS);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  },
};
