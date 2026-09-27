const TZ = 'Asia/Kolkata';
const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, weekday: 'short' });
const day = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric' });
const month = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, month: 'short' });

// `dates` are YYYY-MM-DD strings. Noon IST keeps the formatted day stable in any timezone.
export default function DateStrip({ dates, value, onChange }) {
  return (
    <div role="tablist" aria-label="Choose a date" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
      {dates.map((d, i) => {
        const date = new Date(`${d}T12:00:00+05:30`);
        const active = d === value;
        return (
          <button
            key={d}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(d)}
            className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 transition ${
              active
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-ink-700 text-zinc-300 hover:border-ink-600 hover:bg-ink-800'
            }`}
          >
            <span className="text-xs uppercase">{i === 0 ? 'Today' : weekday.format(date)}</span>
            <span className="text-xl font-bold">{day.format(date)}</span>
            <span className="text-xs uppercase">{month.format(date)}</span>
          </button>
        );
      })}
    </div>
  );
}
