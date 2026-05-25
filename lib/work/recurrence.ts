/**
 * Recurrence engine. Computes the next occurrence for a task given its
 * recurrence_rule and a previous due_date (or completion date).
 *
 * Supports daily/weekly/monthly/yearly with interval, by_weekday,
 * by_month_day, by_month, count, and until.
 */

import type { RecurrenceRule } from "./types";

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  const day = x.getUTCDate();
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + n);
  const dim = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(day, dim));
  return x;
}

function addYears(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCFullYear(x.getUTCFullYear() + n);
  return x;
}

/**
 * Compute the next occurrence strictly AFTER `from`.
 * Returns null when the recurrence is exhausted (count exceeded or past until).
 */
export function nextOccurrence(
  rule: RecurrenceRule,
  from: Date,
  alreadyOccurred = 0
): Date | null {
  if (rule.count != null && alreadyOccurred >= rule.count) return null;

  const interval = Math.max(1, rule.interval || 1);
  let candidate: Date;

  switch (rule.frequency) {
    case "daily":
      candidate = addDays(from, interval);
      break;

    case "weekly": {
      if (rule.by_weekday && rule.by_weekday.length > 0) {
        // Find next listed weekday after `from`
        const sorted = [...rule.by_weekday].sort((a, b) => a - b);
        const fromDow = from.getUTCDay();
        const sameWeek = sorted.find((d) => d > fromDow);
        if (sameWeek !== undefined) {
          candidate = addDays(from, sameWeek - fromDow);
        } else {
          // Jump `interval` weeks then to first listed weekday
          const daysToWeekStart = 7 - fromDow + sorted[0];
          candidate = addDays(from, daysToWeekStart + 7 * (interval - 1));
        }
      } else {
        candidate = addDays(from, 7 * interval);
      }
      break;
    }

    case "monthly": {
      if (rule.by_month_day && rule.by_month_day.length > 0) {
        const sorted = [...rule.by_month_day].sort((a, b) => a - b);
        const fromDom = from.getUTCDate();
        const sameMonth = sorted.find((d) => d > fromDom);
        if (sameMonth !== undefined) {
          const x = new Date(from);
          x.setUTCDate(sameMonth);
          candidate = x;
        } else {
          const next = addMonths(from, interval);
          next.setUTCDate(sorted[0]);
          candidate = next;
        }
      } else {
        candidate = addMonths(from, interval);
      }
      break;
    }

    case "yearly": {
      if (rule.by_month && rule.by_month.length > 0) {
        const sorted = [...rule.by_month].sort((a, b) => a - b);
        const fromMonth = from.getUTCMonth() + 1;
        const sameYear = sorted.find((m) => m > fromMonth);
        if (sameYear !== undefined) {
          const x = new Date(from);
          x.setUTCMonth(sameYear - 1);
          candidate = x;
        } else {
          const next = addYears(from, interval);
          next.setUTCMonth(sorted[0] - 1);
          candidate = next;
        }
      } else {
        candidate = addYears(from, interval);
      }
      break;
    }

    default:
      return null;
  }

  if (rule.until) {
    const until = new Date(rule.until);
    if (candidate > until) return null;
  }
  return candidate;
}

/**
 * Validate a recurrence rule object at runtime.
 */
export function isValidRecurrenceRule(value: unknown): value is RecurrenceRule {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<RecurrenceRule>;
  if (!r.frequency) return false;
  if (!["daily", "weekly", "monthly", "yearly"].includes(r.frequency)) return false;
  if (r.interval != null && (typeof r.interval !== "number" || r.interval < 1)) return false;
  return true;
}
