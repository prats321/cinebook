import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { formatDate, formatPrice, formatTime } from '../lib/format.js';
import { Poster } from '../components/MovieCard.jsx';
import BookingStatus from '../components/BookingStatus.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/Status.jsx';

function BookingCard({ booking }) {
  const { show } = booking;
  return (
    <Link
      to={`/bookings/${booking._id}`}
      className="flex gap-4 rounded-xl border border-ink-700 bg-ink-900 p-4 transition hover:border-ink-600 hover:bg-ink-800/60"
    >
      <div className="w-16 shrink-0 overflow-hidden rounded-lg">
        <Poster movie={show.movie} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold">{show.movie.title}</h3>
          <BookingStatus status={booking.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {formatDate(show.startTime)} · {formatTime(show.startTime)}
        </p>
        <p className="truncate text-sm text-zinc-400">{show.theatre.name}</p>
        <p className="mt-2 text-sm">
          <span className="text-zinc-400">Seats</span> {booking.seats.join(', ')}
          <span className="ml-3 font-semibold">{formatPrice(booking.amount)}</span>
        </p>
      </div>
    </Link>
  );
}

export default function MyBookings() {
  const { data, loading, error, reload } = useApi('/bookings/me');
  const [tab, setTab] = useState('upcoming');

  if (loading && !data) return <Spinner className="py-40" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const now = Date.now();
  const upcoming = data.bookings.filter((b) => b.status === 'CONFIRMED' && new Date(b.show.startTime) > now);
  const past = data.bookings.filter((b) => !upcoming.includes(b));
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">My bookings</h1>

      <div role="tablist" className="mt-6 flex w-fit rounded-lg border border-ink-700 bg-ink-900 p-1">
        {[
          ['upcoming', `Upcoming (${upcoming.length})`],
          ['past', `Past & cancelled (${past.length})`],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === value ? 'bg-ink-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {list.length === 0 ? (
          <EmptyState title={tab === 'upcoming' ? 'No upcoming bookings' : 'Nothing here yet'}>
            <Link to="/" className="font-semibold text-brand-400 hover:underline">
              Browse movies
            </Link>
          </EmptyState>
        ) : (
          list.map((b) => <BookingCard key={b._id} booking={b} />)
        )}
      </div>
    </div>
  );
}
