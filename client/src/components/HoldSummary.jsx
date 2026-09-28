import { ClockIcon } from './icons.jsx';
import { formatPrice } from '../lib/format.js';
import { CATEGORY_LABELS, categoryOf, sortSeats } from '../lib/seats.js';

function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Order summary shown while the user's seats are held for them.
export default function HoldSummary({ layout, prices, seats, secondsLeft, onChangeSeats, onPay, busy, paying }) {
  const ordered = sortSeats(layout, seats);

  const lines = {};
  for (const seat of ordered) {
    const cat = categoryOf(layout, seat);
    lines[cat] ??= { seats: [], price: prices[cat] };
    lines[cat].seats.push(seat);
  }
  const total = ordered.reduce((sum, s) => sum + prices[categoryOf(layout, s)], 0);
  const urgent = secondsLeft <= 60;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div
          role="timer"
          aria-live="off"
          className={`mb-3 flex items-center gap-2 text-sm font-medium ${urgent ? 'text-red-300' : 'text-amber-200'}`}
        >
          <ClockIcon className="size-4" />
          Seats held for you for <span className="font-bold tabular-nums">{formatClock(secondsLeft)}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <dl className="space-y-1 text-sm">
            {Object.entries(lines).map(([cat, line]) => (
              <div key={cat} className="flex gap-3">
                <dt className="text-zinc-400">
                  {CATEGORY_LABELS[cat]} × {line.seats.length}{' '}
                  <span className="text-zinc-500">({line.seats.join(', ')})</span>
                </dt>
                <dd className="ml-auto sm:ml-0">{formatPrice(line.price * line.seats.length)}</dd>
              </div>
            ))}
            <div className="flex gap-3 pt-1 text-lg font-bold">
              <dt>Total</dt>
              <dd className="ml-auto sm:ml-0">{formatPrice(total)}</dd>
            </div>
          </dl>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex gap-2">
              <button
                onClick={onChangeSeats}
                disabled={busy}
                className="flex-1 rounded-lg border border-ink-600 px-4 py-2.5 text-sm font-semibold hover:bg-ink-800 disabled:opacity-60 sm:flex-none"
              >
                Change seats
              </button>
              <button
                onClick={onPay}
                disabled={busy}
                className="flex-1 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 sm:flex-none"
              >
                {paying ? 'Processing…' : `Pay ${formatPrice(total)}`}
              </button>
            </div>
            <p className="text-xs text-zinc-500">Secure payment by Razorpay · Test mode, no real money</p>
          </div>
        </div>
      </div>
    </div>
  );
}
