import { LeaveCalculationResult } from './types';

export interface HolidayInput {
  holiday_date: string; // ISO YYYY-MM-DD
  holiday_name: string;
  active?: boolean;
}

/**
 * Calculates working days between start date and end date inclusive.
 * In Nepal, Saturday (day 6) is the standard weekly rest day.
 * Active organization holidays are also deducted.
 */
export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
  holidays: HolidayInput[] = [],
  weeklyHolidayDayOfWeek: number | null = null
): LeaveCalculationResult {
  if (!startDateStr || !endDateStr) {
    return {
      calendarDays: 0,
      saturdaysExcluded: 0,
      holidaysExcluded: 0,
      excludedHolidayNames: [],
      calculatedDays: 0,
      isEligible: false,
      validationError: 'Both start date and end date are required.',
    };
  }

  // Parse YYYY-MM-DD cleanly using year, month, day components to avoid UTC drift
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      calendarDays: 0,
      saturdaysExcluded: 0,
      holidaysExcluded: 0,
      excludedHolidayNames: [],
      calculatedDays: 0,
      isEligible: false,
      validationError: 'Invalid date format provided. Expected YYYY-MM-DD.',
    };
  }

  if (end.getTime() < start.getTime()) {
    return {
      calendarDays: 0,
      saturdaysExcluded: 0,
      holidaysExcluded: 0,
      excludedHolidayNames: [],
      calculatedDays: 0,
      isEligible: false,
      validationError: 'Leave end date cannot be earlier than start date.',
    };
  }

  // Map active holidays by date string
  const activeHolidayMap = new Map<string, string>();
  for (const h of holidays) {
    if (h.active !== false) {
      activeHolidayMap.set(h.holiday_date, h.holiday_name);
    }
  }

  let current = new Date(start);
  let calendarDays = 0;
  let saturdaysExcluded = 0;
  let holidaysExcluded = 0;
  let calculatedDays = 0;
  const excludedHolidayNames: string[] = [];

  while (current.getTime() <= end.getTime()) {
    calendarDays++;
    const dayOfWeek = current.getUTCDay(); // 0 = Sunday, ..., 6 = Saturday
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    const dateIso = `${y}-${m}-${d}`;

    if (
      weeklyHolidayDayOfWeek !== null &&
      weeklyHolidayDayOfWeek !== undefined &&
      weeklyHolidayDayOfWeek >= 0 &&
      dayOfWeek === weeklyHolidayDayOfWeek
    ) {
      saturdaysExcluded++;
    } else if (activeHolidayMap.has(dateIso)) {
      holidaysExcluded++;
      excludedHolidayNames.push(activeHolidayMap.get(dateIso)!);
    } else {
      calculatedDays += 1.0;
    }

    // Move to next day UTC
    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (calculatedDays <= 0) {
    return {
      calendarDays,
      saturdaysExcluded,
      holidaysExcluded,
      excludedHolidayNames,
      calculatedDays: 0,
      isEligible: false,
      validationError:
        'Selected dates contain 0 working days. The entire duration falls on weekly rest days (Saturday) or organization holidays.',
    };
  }

  return {
    calendarDays,
    saturdaysExcluded,
    holidaysExcluded,
    excludedHolidayNames,
    calculatedDays,
    isEligible: true,
  };
}
