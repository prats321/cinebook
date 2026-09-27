import { useLayoutEffect, useRef } from 'react';
import { CATEGORY_LABELS, groupRows } from '../lib/seats.js';
import { formatPrice } from '../lib/format.js';

const SEAT_STYLES = {
  available: 'border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/15',
  selected: 'border-brand-500 bg-brand-500 text-white',
  booked: 'cursor-not-allowed border-ink-700 bg-ink-700 text-ink-600',
  held: 'cursor-not-allowed border-amber-500/30 bg-amber-500/10 text-amber-500/40',
};

function Seat({ id, number, status, category, price, onToggle, disabled }) {
  const unavailable = status === 'booked' || status === 'held';
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      disabled={unavailable || disabled}
      aria-pressed={status === 'selected'}
      aria-label={`Seat ${id}, ${CATEGORY_LABELS[category]}, ${formatPrice(price)}, ${
        { available: 'available', selected: 'selected', booked: 'sold', held: 'held by someone else' }[status]
      }`}
      className={`grid size-7 shrink-0 place-items-center rounded-t-md rounded-b-sm border text-[10px] font-semibold transition sm:size-8 ${SEAT_STYLES[status]} ${
        disabled && !unavailable ? 'cursor-default' : ''
      }`}
    >
      {number}
    </button>
  );
}

export function SeatLegend() {
  const items = [
    ['available', 'Available'],
    ['selected', 'Selected'],
    ['held', 'Held by others'],
    ['booked', 'Sold'],
  ];
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-zinc-400">
      {items.map(([status, label]) => (
        <span key={status} className="flex items-center gap-2">
          <span className={`inline-block size-4 rounded-t-md rounded-b-sm border ${SEAT_STYLES[status]}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

// statusOf(seatId) -> 'available' | 'selected' | 'booked' | 'held'
export default function SeatMap({ layout, prices, statusOf, onToggle, disabled = false }) {
  // On phones the map is wider than the screen. Start scrolled to the middle so the
  // centre seats (the ones most people want) are in view, instead of the left edge.
  const scrollerRef = useRef(null);
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []); // once on mount: re-running on every 15s poll would yank the user's scroll position

  return (
    <div ref={scrollerRef} className="scrollbar-none overflow-x-auto pb-2">
      <div className="mx-auto w-max min-w-full space-y-6 px-2">
        {groupRows(layout).map(({ category, rows }) => (
          <section key={rows[0].label}>
            <h3 className="mb-3 border-b border-ink-800 pb-2 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {CATEGORY_LABELS[category]} · {formatPrice(prices[category])}
            </h3>
            <div className="space-y-2">
              {rows.map((row) => {
                const half = Math.ceil(row.seats / 2);
                return (
                  <div key={row.label} className="flex items-center justify-center gap-1.5">
                    <span className="w-6 shrink-0 text-center text-xs font-medium text-zinc-500">{row.label}</span>
                    {Array.from({ length: row.seats }, (_, i) => {
                      const id = `${row.label}${i + 1}`;
                      return (
                        <div key={id} className="flex">
                          {/* centre aisle */}
                          {i === half && <span className="w-4 shrink-0 sm:w-6" aria-hidden="true" />}
                          <Seat
                            id={id}
                            number={i + 1}
                            status={statusOf(id)}
                            category={category}
                            price={prices[category]}
                            onToggle={onToggle}
                            disabled={disabled}
                          />
                        </div>
                      );
                    })}
                    <span className="w-6 shrink-0" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="pt-4" aria-hidden="true">
          <div className="mx-auto h-2 w-3/4 rounded-[50%] border-t-4 border-brand-500/60 shadow-[0_-8px_24px_-4px] shadow-brand-500/40" />
          <p className="mt-2 text-center text-xs uppercase tracking-[0.3em] text-zinc-500">Screen this way</p>
        </div>
      </div>
    </div>
  );
}
