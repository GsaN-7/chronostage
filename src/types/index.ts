/**
 * ChronoStage - Data Models & Types
 * Clean separation: Program (template), Event (scheduled instance), TimerSession (active execution).
 */

export interface ProgramItem {
  id: string;
  order: number;
  title: string;
  durationSeconds: number;
  description?: string;
  speaker?: string;
  color?: string; // Optional accent tag color
}

export interface Program {
  id: string;
  title: string;
  description?: string;
  category?: string; // e.g. "Совещания", "Презентации", "Тренировки", "Конференции"
  items: ProgramItem[];
  targetDurationSeconds?: number; // Optional desired total duration
  calculatedDurationSeconds: number; // Auto sum of items
  notificationConfig?: {
    sound: boolean;
    soundType: 'chime' | 'bell' | 'beep' | 'gong';
    voice: boolean;
    notifyBeforeItemEndSeconds: number;
  };
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export type RecurrenceFrequency = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // every N days/weeks/months
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  count?: number; // Max occurrences
}

export type EventStatus = 'scheduled' | 'running' | 'completed' | 'cancelled';

export interface EventItemSnapshot {
  id: string;
  order: number;
  title: string;
  durationSeconds: number;
  description?: string;
  speaker?: string;
}

export interface ScheduledEvent {
  id: string;
  programId?: string; // Reference to source template (optional if one-off)
  title: string;
  description?: string;
  category?: string;
  scheduledDate: string; // YYYY-MM-DD (keeps timezone neutral)
  scheduledTime: string; // HH:mm:ss
  targetDurationSeconds?: number;
  calculatedDurationSeconds: number;
  status: EventStatus;
  
  // Independent snapshot: altering the program template does not mutate already scheduled/finished events!
  snapshotItems: EventItemSnapshot[];
  
  recurrenceRule?: RecurrenceRule;
  recurrenceParentId?: string; // If this event was expanded from a recurring rule
  
  actualStartTime?: number; // Epoch timestamp ms
  actualEndTime?: number; // Epoch timestamp ms
  actualDurationSeconds?: number;

  createdAt: string;
  updatedAt: string;
}

export interface CompletedItemStat {
  itemId: string;
  order: number;
  title: string;
  plannedSeconds: number;
  actualSeconds: number;
  skipped: boolean;
}

export interface TimeAdjustment {
  id: string;
  itemId: string;
  deltaSeconds: number; // e.g. +60, -60, +300
  timestamp: number; // Epoch ms
}

export interface TimerSession {
  sessionId: string;
  eventId: string;
  programTitle: string;
  items: EventItemSnapshot[];
  currentItemIndex: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  
  // Absolute timestamp anchor for drift-free background execution
  sessionStartTimestamp: number; // Epoch ms when session began
  itemStartTimestamp: number; // Epoch ms when current item started running
  itemPlannedDurationSeconds: number; // Active planned duration including manual adjustments
  itemElapsedBeforePauseSeconds: number; // Accumulated seconds while item was running prior to pause
  pauseStartTimestamp?: number; // Epoch ms when paused
  
  adjustments: TimeAdjustment[];
  skippedItemIds: string[];
  completedItemStats: CompletedItemStat[];
  
  lastTickTimestamp: number;
}

export interface SessionLog {
  id: string;
  eventId: string;
  programTitle: string;
  category?: string;
  scheduledDate: string;
  scheduledTime: string;
  actualStartTime: number; // Epoch ms
  actualEndTime: number; // Epoch ms
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  items: CompletedItemStat[];
  adjustmentsCount: number;
  status: 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface CalculatedTimelineItem {
  id: string;
  order: number;
  title: string;
  durationSeconds: number;
  speaker?: string;
  startTimeFormatted: string; // HH:mm:ss
  endTimeFormatted: string; // HH:mm:ss
  startOffsetSeconds: number;
  endOffsetSeconds: number;
}

export interface AppSettings {
  soundEnabled: boolean;
  soundType: 'chime' | 'bell' | 'beep' | 'gong';
  soundVolume: number; // 0.0 to 1.0
  speechEnabled: boolean;
  speechVoiceName?: string;
  notificationsEnabled: boolean;
  leadWarningMinutes: number; // Notify X minutes before event starts
  keepScreenAwake: boolean;
  theme: 'dark' | 'light';
}

export type ActiveTab = 'today' | 'schedule' | 'programs' | 'history' | 'settings';
export type DisplayMode = 'standard' | 'timer' | 'presenter';
