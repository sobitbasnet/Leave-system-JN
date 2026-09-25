import test from 'node:test';
import assert from 'node:assert/strict';

// Import pure calculator logic
function calculateWorkingDays(
  startDateStr,
  endDateStr,
  holidays = [],
  weeklyHolidayDayOfWeek = null
) {
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

  const activeHolidayMap = new Map();
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
  const excludedHolidayNames = [];

  while (current.getTime() <= end.getTime()) {
    calendarDays++;
    const dayOfWeek = current.getUTCDay();
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
      excludedHolidayNames.push(activeHolidayMap.get(dateIso));
    } else {
      calculatedDays += 1.0;
    }

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

test('Leave Calculator: 24th to 26th equals 3 full leave days', () => {
  // 2026-09-24 to 2026-09-26 is 3 days
  const res = calculateWorkingDays('2026-09-24', '2026-09-26', []);
  assert.equal(res.isEligible, true);
  assert.equal(res.calculatedDays, 3);
  assert.equal(res.calendarDays, 3);
});

test('Leave Calculator: Single day 25th to 25th equals 1 leave day', () => {
  // Tomorrow 25th to 25th is exactly 1 day
  const res = calculateWorkingDays('2026-09-25', '2026-09-25', []);
  assert.equal(res.isEligible, true);
  assert.equal(res.calculatedDays, 1);
  assert.equal(res.calendarDays, 1);
});

test('Leave Calculator: Explicit Saturday exclusion when weeklyHolidayDayOfWeek is 6', () => {
  // 2026-10-02 (Fri) to 2026-10-04 (Sun) with weeklyHolidayDayOfWeek = 6
  const res = calculateWorkingDays('2026-10-02', '2026-10-04', [], 6);
  assert.equal(res.isEligible, true);
  assert.equal(res.calculatedDays, 2);
  assert.equal(res.saturdaysExcluded, 1);
  assert.equal(res.calendarDays, 3);
});

test('Leave Calculator: Organization holiday inside date range is excluded', () => {
  // 2026-10-04 (Sun) to 2026-10-06 (Tue) with holiday on 2026-10-05 (Mon)
  const holidays = [
    { holiday_date: '2026-10-05', holiday_name: 'Dashain Festival', active: true },
  ];
  const res = calculateWorkingDays('2026-10-04', '2026-10-06', holidays);
  assert.equal(res.isEligible, true);
  assert.equal(res.calculatedDays, 2);
  assert.equal(res.holidaysExcluded, 1);
  assert.deepEqual(res.excludedHolidayNames, ['Dashain Festival']);
});

test('Leave Calculator: End date earlier than start date returns validation error', () => {
  const res = calculateWorkingDays('2026-10-10', '2026-10-05', []);
  assert.equal(res.isEligible, false);
  assert.match(res.validationError, /earlier than start date/i);
});
