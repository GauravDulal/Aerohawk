/**
 * Format a date string (YYYY-MM-DD) to a human-readable format.
 * Matches the prototype's `fmt()` function using en-AU locale.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time strings from HH:MM:SS (Postgres TIME) to HH:MM display format.
 */
export function formatTime(time: string): string {
  return time.slice(0, 5); // "09:00:00" → "09:00"
}

/**
 * Format a time range for display.
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)}-${formatTime(endTime)}`;
}

/**
 * Check if a slot on the current day has already passed.
 * Returns true if the slot is still in the future (bookable).
 */
export function isSlotInFuture(date: string, startTime: string): boolean {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (date > today) return true;
  if (date < today) return false;

  // Same day: compare slot start time to current time
  const [h, m] = startTime.split(':').map(Number);
  return h * 60 + m > now.getHours() * 60 + now.getMinutes();
}

/**
 * Get the month boundaries for Supabase queries.
 */
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/**
 * Generate a date string from year, month, day.
 */
export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
