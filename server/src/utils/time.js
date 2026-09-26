// All theatres are in India, so a "date" from the client means an IST calendar day.
// Servers (Render, AWS) run in UTC, so we can't rely on the machine's local timezone.
const IST_OFFSET = '+05:30';

export function istDayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00${IST_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function istDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00${IST_OFFSET}`);
}

export function todayInIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
}
