import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { formatDate, formatLongDate, formatPrice, formatTime } from '../lib/format.js';
import { CATEGORY_LABELS } from '../lib/seats.js';
import { Poster } from '../components/MovieCard.jsx';
import TicketQR from '../components/TicketQR.jsx';
import BookingStatus from '../components/BookingStatus.jsx';
import { ErrorState, Spinner } from '../components/Status.jsx';
import { ChevronLeftIcon, MapPinIcon } from '../components/icons.jsx';
import NotFound from './NotFound.jsx';

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}

function CancelButton({ booking, onCancelled }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  const cancel = async () => {
    setWorking(true);
    try {
      const { booking: updated } = await api.post(`/bookings/${booking._id}/cancel`);
      toast.success(`Booking cancelled. ${formatPrice(updated.amount)} will be refunded to your original payment method.`);
      onCancelled();
    } catch (err) {
      toast.error(err.message);
      setWorking(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-sm font-semibold text-red-300 hover:underline">
        Cancel booking
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label="Confirm cancellation" className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-zinc-300">Cancel and get a full refund?</span>
      <button
        onClick={cancel}
        disabled={working}
        className="rounded-lg bg-red-500/90 px-3 py-1.5 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
      >
        {working ? 'Cancelling…' : 'Yes, cancel'}
      </button>
      <button onClick={() => setConfirming(false)} disabled={working} className="text-zinc-400 hover:text-zinc-200">
        Keep it
      </button>
    </div>
  );
}

export default function Ticket() {
  const { id } = useParams();
  const location = useLocation();
  const { data, loading, error, reload } = useApi(`/bookings/${id}`);

  if (loading && !data) return <Spinner className="py-40" />;
  if (error?.status === 404 || error?.status === 400) return <NotFound />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { booking } = data;
  const { show } = booking;
  const justBooked = location.state?.justBooked && booking.status === 'CONFIRMED';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/bookings" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 print:hidden">
        <ChevronLeftIcon className="size-4" /> My bookings
      </Link>

      {justBooked && (
        <div role="status" className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 print:hidden">
          <p className="font-semibold text-emerald-200">🎉 Booking confirmed!</p>
          <p className="text-sm text-emerald-100/80">Show this QR code at the theatre entrance.</p>
        </div>
      )}

      <article className="mt-4 overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 print:border-zinc-300 print:bg-white print:text-black">
        <div className="flex gap-4 p-5">
          <div className="w-20 shrink-0 overflow-hidden rounded-lg sm:w-24">
            <Poster movie={show.movie} />
          </div>
          <div className="min-w-0">
            <BookingStatus status={booking.status} />
            <h1 className="mt-2 text-xl font-bold sm:text-2xl">{show.movie.title}</h1>
            <p className="text-sm text-zinc-400">
              {[show.language, show.format].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-2 flex items-start gap-1 text-sm text-zinc-300">
              <MapPinIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                {show.theatre.name}, {show.theatre.address}
              </span>
            </p>
          </div>
        </div>

        {/* perforated edge */}
        <div className="relative border-t-2 border-dashed border-ink-700" aria-hidden="true">
          <span className="absolute -left-3 -top-3 size-6 rounded-full bg-ink-950" />
          <span className="absolute -right-3 -top-3 size-6 rounded-full bg-ink-950" />
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto]">
          <dl className="grid grid-cols-2 gap-4">
            <Row label="Date">{formatDate(show.startTime)}</Row>
            <Row label="Time">{formatTime(show.startTime)}</Row>
            <Row label="Screen">{show.screenName}</Row>
            <Row label={`Seats (${booking.seats.length})`}>{booking.seats.join(', ')}</Row>
            <Row label="Booking ID">
              <span className="font-mono tracking-wider">{booking.bookingCode}</span>
            </Row>
            <Row label="Amount paid">{formatPrice(booking.amount)}</Row>
          </dl>
          {booking.status === 'CONFIRMED' && <TicketQR code={booking.bookingCode} className="mx-auto" />}
        </div>

        <div className="border-t border-ink-800 px-5 py-4 text-sm">
          {booking.items.length > 0 && (
            <ul className="space-y-1 text-zinc-400">
              {Object.entries(
                booking.items.reduce((acc, i) => {
                  acc[i.category] ??= { count: 0, price: i.price };
                  acc[i.category].count++;
                  return acc;
                }, {}),
              ).map(([cat, { count, price }]) => (
                <li key={cat} className="flex justify-between">
                  <span>
                    {CATEGORY_LABELS[cat]} × {count}
                  </span>
                  <span>{formatPrice(price * count)}</span>
                </li>
              ))}
            </ul>
          )}
          {booking.status === 'CANCELLED' && (
            <p className="mt-3 text-zinc-300">
              Cancelled on {formatLongDate(booking.cancelledAt)}.{' '}
              {booking.payment.refunded ? 'Refund initiated to your original payment method.' : 'Refund is being processed.'}
            </p>
          )}
          {booking.status === 'FAILED' && (
            <p className="mt-3 text-red-200">
              {booking.failureReason}. {booking.payment.refunded ? 'Your payment has been refunded.' : 'Your refund is being processed.'}
            </p>
          )}
        </div>
      </article>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
        {booking.status === 'CONFIRMED' && (
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-ink-600 px-4 py-2 text-sm font-semibold hover:bg-ink-800"
          >
            Print / save as PDF
          </button>
        )}
        {booking.canCancel ? (
          <CancelButton booking={booking} onCancelled={reload} />
        ) : (
          booking.status === 'CONFIRMED' && (
            <p className="text-xs text-zinc-500">Cancellation closes 2 hours before the show.</p>
          )
        )}
      </div>
    </div>
  );
}
