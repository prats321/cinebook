// Every theatre is in India, so times are always shown in IST, whatever the viewer's device says.
const TZ = 'Asia/Kolkata';

const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const longDateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
const isoDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }); // en-CA gives YYYY-MM-DD

export const formatDate = (d) => dateFmt.format(new Date(d));
export const formatLongDate = (d) => longDateFmt.format(new Date(d));
export const formatTime = (d) => timeFmt.format(new Date(d)).toUpperCase();
export const toISODate = (d) => isoDateFmt.format(new Date(d));

export function formatRuntime(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export const formatPrice = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// The next `count` days as YYYY-MM-DD strings in IST, starting today.
export function upcomingDates(count) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => toISODate(now + i * 86_400_000));
}
