/**
 * ChronoStage - Time calculation and formatting utilities
 */

import { CalculatedTimelineItem, EventItemSnapshot, ProgramItem } from '../types';

/**
 * Format seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number, forceHours = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (h > 0 || forceHours) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Format seconds into Russian human-readable words (e.g. "1 ч 20 мин" or "45 сек")
 */
export function formatDurationTextRu(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 мин';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ч`);
  if (m > 0) parts.push(`${m} мин`);
  if (s > 0 && h === 0) parts.push(`${s} сек`);
  return parts.join(' ') || '0 сек';
}

/**
 * Parse HH:mm or HH:mm:ss into total seconds from midnight
 */
export function timeStringToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10) || 0);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 3600 + m * 60 + s;
}

/**
 * Convert seconds from midnight back to HH:mm:ss
 */
export function secondsToTimeString(totalSeconds: number, includeSeconds = true): string {
  let sec = totalSeconds % 86400;
  if (sec < 0) sec += 86400;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (includeSeconds) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(h)}:${pad(m)}`;
}

/**
 * Given a base start time (HH:mm:ss or HH:mm) and a list of items,
 * computes the calculated start and end times for each item sequentially.
 */
export function computeTimeline(
  baseStartTime: string,
  items: (ProgramItem | EventItemSnapshot)[]
): CalculatedTimelineItem[] {
  const baseSeconds = timeStringToSeconds(baseStartTime);
  let currentOffset = 0;

  return items.map((item) => {
    const startSec = (baseSeconds + currentOffset) % 86400;
    const endSec = (startSec + item.durationSeconds) % 86400;
    const result: CalculatedTimelineItem = {
      id: item.id,
      order: item.order,
      title: item.title,
      durationSeconds: item.durationSeconds,
      speaker: item.speaker,
      startTimeFormatted: secondsToTimeString(startSec, false),
      endTimeFormatted: secondsToTimeString(endSec, false),
      startOffsetSeconds: currentOffset,
      endOffsetSeconds: currentOffset + item.durationSeconds,
    };
    currentOffset += item.durationSeconds;
    return result;
  });
}

/**
 * Calculate total planned duration in seconds from an item list
 */
export function calculateTotalDuration(items: (ProgramItem | EventItemSnapshot)[]): number {
  return items.reduce((sum, item) => sum + (item.durationSeconds || 0), 0);
}

/**
 * Format YYYY-MM-DD to human Russian date string
 */
export function formatDateRu(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays === -1) return 'Вчера';

  return date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get current date as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current time as HH:mm:ss
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Combine YYYY-MM-DD and HH:mm:ss into epoch milliseconds timestamp
 */
export function getEpochFromDateTime(dateStr: string, timeStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, min, sec] = timeStr.split(':').map((v) => Number(v) || 0);
  return new Date(year, month - 1, day, hour, min, sec).getTime();
}
