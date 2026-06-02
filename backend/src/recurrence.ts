import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfMonth,
  endOfMonth,
  getDay,
  isBefore,
  isEqual,
  parseISO,
  format,
} from 'date-fns';

export interface ScheduleRule {
  repeatInterval: number;
  repeatType: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endType: 'never' | 'date' | 'after';
  endDate: string | null;
  endOccurrences: number | null;
  specificDays: string[] | null;
  weekendAdjustment: 'none' | 'before' | 'after';
}

export interface Occurrence {
  dueDate: string;
  occurrenceIndex: number;
}

function applyWeekendAdjustment(date: Date, adjustment: 'none' | 'before' | 'after'): Date {
  if (adjustment === 'none') return date;
  const day = getDay(date);
  if (day === 0 || day === 6) {
    if (adjustment === 'before') {
      return addDays(date, day === 0 ? -2 : -1);
    } else {
      return addDays(date, day === 6 ? 2 : 1);
    }
  }
  return date;
}

function getSpecificDatesInMonth(year: number, month: number, specificDays: string[]): Date[] {
  const dates: Date[] = [];
  for (const dayStr of specificDays) {
    if (dayStr === 'last') {
      dates.push(endOfMonth(new Date(year, month)));
    } else {
      const dayNum = parseInt(dayStr, 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        dates.push(new Date(year, month, dayNum));
      }
    }
  }
  return dates;
}

function getSpecificDatesInWeek(year: number, month: number, dayOfMonth: number, specificDays: string[]): Date[] {
  const weekdays: number[] = [];
  const weekdayMap: Record<string, number> = {
    'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6,
  };
  for (const d of specificDays) {
    const upper = d.toUpperCase();
    if (upper in weekdayMap) {
      weekdays.push(weekdayMap[upper]);
    }
  }
  if (weekdays.length === 0) return [];

  const date = new Date(year, month, dayOfMonth);
  const dow = getDay(date);
  if (weekdays.includes(dow)) {
    return [date];
  }
  return [];
}

export function computeNextOccurrences(
  rule: ScheduleRule,
  paidDates: string[],
  count: number = 10,
): Occurrence[] {
  const startDate = parseISO(rule.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paidSet = new Set(paidDates);
  const results: Occurrence[] = [];
  let occurrenceCount = 0;
  let maxIterations = 1000;

  if (rule.specificDays && rule.specificDays.length > 0 && rule.repeatType === 'month') {
    let currentDate = new Date(startDate);
    while (results.length < count && maxIterations > 0) {
      maxIterations--;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const candidates = getSpecificDatesInMonth(year, month, rule.specificDays);

      for (const candidate of candidates) {
        if (results.length >= count) break;
        if (isBefore(candidate, today)) continue;

        const adjusted = applyWeekendAdjustment(candidate, rule.weekendAdjustment);
        const dateStr = format(adjusted, 'yyyy-MM-dd');
        if (paidSet.has(dateStr)) continue;

        occurrenceCount++;
        if (rule.endType === 'after' && rule.endOccurrences !== null && occurrenceCount > rule.endOccurrences) break;

        results.push({ dueDate: dateStr, occurrenceIndex: occurrenceCount });
      }

      if (rule.endType === 'after' && rule.endOccurrences !== null && occurrenceCount >= rule.endOccurrences) break;
      if (rule.endType === 'date' && rule.endDate && isBefore(currentDate, parseISO(rule.endDate)) === false) break;

      if (rule.repeatInterval > 0) {
        currentDate = addMonths(currentDate, rule.repeatInterval);
      } else {
        break;
      }
    }
  } else if (rule.specificDays && rule.specificDays.length > 0 && rule.repeatType === 'week') {
    let currentDate = startDate;
    while (results.length < count && maxIterations > 0) {
      maxIterations--;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const dayOfMonth = currentDate.getDate();

      const candidates = getSpecificDatesInWeek(year, month, dayOfMonth, rule.specificDays);
      for (const candidate of candidates) {
        if (results.length >= count) break;
        if (isBefore(candidate, today)) continue;

        const adjusted = applyWeekendAdjustment(candidate, rule.weekendAdjustment);
        const dateStr = format(adjusted, 'yyyy-MM-dd');
        if (paidSet.has(dateStr)) continue;

        occurrenceCount++;
        if (rule.endType === 'after' && rule.endOccurrences !== null && occurrenceCount > rule.endOccurrences) break;
        results.push({ dueDate: dateStr, occurrenceIndex: occurrenceCount });
      }

      if (rule.endType === 'after' && rule.endOccurrences !== null && occurrenceCount >= rule.endOccurrences) break;
      if (rule.endType === 'date' && rule.endDate && isBefore(currentDate, parseISO(rule.endDate)) === false) break;

      if (rule.repeatInterval > 0) {
        currentDate = addWeeks(currentDate, rule.repeatInterval);
      } else {
        break;
      }
    }
  } else {
    let currentDate = startDate;
    while (results.length < count && maxIterations > 0) {
      maxIterations--;
      if (isBefore(currentDate, today)) {
        currentDate = advanceDate(currentDate, rule);
        if (rule.endType === 'date' && rule.endDate && isBefore(currentDate, parseISO(rule.endDate)) === false) break;
        continue;
      }

      const adjusted = applyWeekendAdjustment(currentDate, rule.weekendAdjustment);
      const dateStr = format(adjusted, 'yyyy-MM-dd');

      if (!paidSet.has(dateStr)) {
        occurrenceCount++;
        if (rule.endType === 'after' && rule.endOccurrences !== null && occurrenceCount > rule.endOccurrences) break;
        results.push({ dueDate: dateStr, occurrenceIndex: occurrenceCount });
      }

      if (rule.endType === 'after' && rule.endOccurrences !== null && occurrenceCount >= rule.endOccurrences) break;

      currentDate = advanceDate(currentDate, rule);

      if (rule.endType === 'date' && rule.endDate && isBefore(currentDate, parseISO(rule.endDate)) === false) break;
    }
  }

  return results;
}

function advanceDate(date: Date, rule: ScheduleRule): Date {
  switch (rule.repeatType) {
    case 'day':
      return addDays(date, rule.repeatInterval);
    case 'week':
      return addWeeks(date, rule.repeatInterval);
    case 'month':
      return addMonths(date, rule.repeatInterval);
    case 'year':
      return addYears(date, rule.repeatInterval);
    default:
      return addMonths(date, 1);
  }
}
