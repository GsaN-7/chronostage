/**
 * ChronoStage - Recurrence Engine
 * Generates and validates recurring event instances.
 */

import { RecurrenceRule, ScheduledEvent } from '../types';

/**
 * Checks if a given date (YYYY-MM-DD) matches the recurrence rule starting from rule.startDate
 */
export function matchesRecurrenceRule(dateStr: string, rule: RecurrenceRule): boolean {
  if (rule.frequency === 'none') return false;
  if (dateStr < rule.startDate) return false;
  if (rule.endDate && dateStr > rule.endDate) return false;

  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon ...

  const [sy, sm, sd] = rule.startDate.split('-').map(Number);
  const startDate = new Date(sy, sm - 1, sd);

  const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (86400 * 1000));
  const interval = rule.interval || 1;

  switch (rule.frequency) {
    case 'daily': {
      return diffDays % interval === 0;
    }
    case 'weekdays': {
      // Monday to Friday
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    }
    case 'weekly': {
      // Specified days of week (default to the day of week of start date)
      const allowedDays = rule.daysOfWeek && rule.daysOfWeek.length > 0 ? rule.daysOfWeek : [startDate.getDay()];
      if (!allowedDays.includes(dayOfWeek)) return false;
      const weekDiff = Math.floor(diffDays / 7);
      return weekDiff % interval === 0;
    }
    case 'monthly': {
      return targetDate.getDate() === startDate.getDate();
    }
    default:
      return false;
  }
}

/**
 * Expand a recurring parent event into concrete instances for a date window (e.g., month or week)
 */
export function expandRecurringEventForWindow(
  parentEvent: ScheduledEvent,
  windowStartDate: string,
  windowEndDate: string,
  existingEventDates: Set<string>
): ScheduledEvent[] {
  if (!parentEvent.recurrenceRule || parentEvent.recurrenceRule.frequency === 'none') {
    return [];
  }

  const rule = parentEvent.recurrenceRule;
  const instances: ScheduledEvent[] = [];

  const [sy, sm, sd] = windowStartDate.split('-').map(Number);
  const [ey, em, ed] = windowEndDate.split('-').map(Number);

  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  let generatedCount = 0;
  const maxLimit = rule.count || 100;

  while (cur <= end && generatedCount < maxLimit) {
    const y = cur.getFullYear();
    const m = (cur.getMonth() + 1).toString().padStart(2, '0');
    const d = cur.getDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    // Skip if instance already exists or is the parent itself on its start date
    if (dateStr !== parentEvent.scheduledDate && !existingEventDates.has(dateStr)) {
      if (matchesRecurrenceRule(dateStr, rule)) {
        instances.push({
          ...parentEvent,
          id: `${parentEvent.id}_rec_${dateStr}`,
          scheduledDate: dateStr,
          recurrenceParentId: parentEvent.id,
          // Status defaults to scheduled for future dates
          status: 'scheduled',
          actualStartTime: undefined,
          actualEndTime: undefined,
          actualDurationSeconds: undefined,
          createdAt: parentEvent.createdAt,
          updatedAt: new Date().toISOString(),
        });
        generatedCount++;
      }
    }

    cur.setDate(cur.getDate() + 1);
  }

  return instances;
}
