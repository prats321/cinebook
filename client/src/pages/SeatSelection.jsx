import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { useShowUpdates } from '../hooks/useShowUpdates.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import SeatMap, { SeatLegend } from '../components/SeatMap.jsx';
import HoldSummary from '../components/HoldSummary.jsx';
import { ErrorState, Spinner } from '../components/Status.jsx';
import { ChevronLeftIcon } from '../components/icons.jsx';
import { api } from '../lib/api.js';
import { openCheckout } from '../lib/razorpay.js';
import { formatDate, formatPrice, formatTime } from '../lib/format.js';
import { MAX_SEATS, priceOf, sortSeats } from '../lib/seats.js';
import NotFound from './NotFound.jsx';

// Seat changes arrive live over Socket.io. This slow poll is only a safety net
// in case the socket is blocked (some office/college networks) or drops quietly.
const POLL_MS = 60_000;

// A guest's picks survive the trip to the login page and back.
const pendingKey = (showId) => `cinebook:pending-seats:${showId}`;

// Read-only: StrictMode runs useState initializers twice, so clearing happens in an effect.
function readPendingSeats(showId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(pendingKey(showId)) || '[]');
    return Array.isArray(saved) ? saved.slice(0, MAX_SEATS) : [];
  } catch {
    return [];
  }
}

function clearPendingSeats(showId) {
  try {
    sessionStorage.removeItem(pendingKey(showId));
  } catch {
    /* nothing to clear */
  }
}

function savePendingSeats(showId, seats) {
  try {
    sessionStorage.setItem(pendingKey(showId), JSON.stringify(seats));
  } catch {
    /* storage blocked: the user just re-picks after login */
  }
}

function ShowHeader({ show, live }) {
  return (
    <div className="border-b border-ink-800 bg-ink-900">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex items-center justify-between">
          <Link
            to={`/movies/${show.movie._id}/shows`}
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
          >
            <ChevronLeftIcon className="size-4" /> Change showtime
          </Link>
          <span
            title={live ? 'Seat changes appear instantly' : 'Reconnecting… seats refresh every minute'}
            className="flex items-center gap-1.5 text-xs text-zinc-400"
          >
            <span className={`inline-block size-2 rounded-full ${live ? 'animate-pulse bg-emerald-400' : 'bg-zinc-600'}`} />
            {live ? 'Live' : 'Offline'}
          </span>
        </div>
        <h1 className="mt-1 text-xl font-bold">{show.movie.title}</h1>
        <p className="text-sm text-zinc-400">
          {show.theatre.name} · {formatDate(show.startTime)}, {formatTime(show.startTime)} · {show.format} · {show.screenName}
        </p>
      </div>
    </div>
  );
}

export default function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const showReq = useApi(`/shows/${id}`);
  const seatsReq = useApi(`/shows/${id}/seats`);
  const [selected, setSelected] = useState(() => readPendingSeats(id));
  const [hold, setHold] = useState(null); // { seats, expiresAt } once the server has locked them
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const payingRef = useRef(false); // read inside the countdown callback without re-subscribing

  useEffect(() => clearPendingSeats(id), [id]);

  const seats = seatsReq.data;
  const booked = useMemo(() => new Set(seats?.booked), [seats]);
  const held = useMemo(() => new Set(seats?.locked), [seats]);

  const { reload } = seatsReq;
  const live = useShowUpdates(id, reload);
  useEffect(() => {
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  // Signing in or out changes which holds count as "mine", so refetch.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    reload();
  }, [user?._id, reload]);

  useEffect(() => {
    if (!seats) return;

    // Came back to the page (refresh, new tab) while still holding seats: resume the hold.
    if (!hold && seats.mine.length && seats.myLockExpiresAt) {
      setHold({ seats: seats.mine, expiresAt: seats.myLockExpiresAt });
      setSelected(seats.mine);
      return;
    }

    // Someone else grabbed a seat we'd picked: drop it and say so.
    const lost = selected.filter((s) => booked.has(s) || held.has(s));
    if (lost.length) {
      setSelected((sel) => sel.filter((s) => !lost.includes(s)));
      toast.info(`${lost.join(', ')} ${lost.length === 1 ? 'was' : 'were'} just taken by someone else`);
    }
  }, [seats]); // only when new seat data arrives

  const secondsLeft = useCountdown(hold?.expiresAt, () => {
    // Mid-payment, let the server decide: it confirms the booking if the seats are
    // still free, or refunds if someone else bought them after the hold lapsed.
    if (payingRef.current) return;
    setHold(null);
    toast.error('Your seat hold expired. Please select your seats again.');
    reload();
  });

  if (showReq.loading || (seatsReq.loading && !seats)) return <Spinner className="py-40" />;
  if (showReq.error?.status === 404 || showReq.error?.status === 400) return <NotFound />;
  if (showReq.error || seatsReq.error) {
    const error = showReq.error || seatsReq.error;
    return <ErrorState error={error} onRetry={showReq.error ? showReq.reload : reload} />;
  }

  const { show } = showReq.data;
  const started = new Date(show.startTime) <= new Date();

  const statusOf = (seatId) => {
    if (booked.has(seatId)) return 'booked';
    if (held.has(seatId)) return 'held';
    return selected.includes(seatId) ? 'selected' : 'available';
  };

  // Functional update so rapid clicks each see the latest selection, not a stale copy.
  const toggle = (seatId) => {
    if (!selected.includes(seatId) && selected.length >= MAX_SEATS) {
      return toast.info(`You can pick up to ${MAX_SEATS} seats at a time`);
    }
    setSelected((sel) => {
      if (sel.includes(seatId)) return sel.filter((s) => s !== seatId);
      return sel.length >= MAX_SEATS ? sel : [...sel, seatId];
    });
  };

  const holdSeats = async () => {
    if (!user) {
      savePendingSeats(id, selected);
      navigate(`/login?next=${encodeURIComponent(`/shows/${id}`)}`);
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(`/shows/${id}/lock`, { seats: selected });
      setHold({ seats: res.seats, expiresAt: res.expiresAt });
    } catch (err) {
      // 409: someone beat us to a seat. Refresh so the map shows who has what.
      toast.error(err.message);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    setBusy(true);
    setPaying(true);
    payingRef.current = true;
    try {
      const checkout = await api.post('/bookings/checkout', { showId: id });
      const response = await openCheckout({
        keyId: checkout.keyId,
        order: checkout.order,
        description: checkout.description,
        prefill: checkout.prefill,
        onFailure: (message) => toast.error(message),
      });
      if (!response) {
        toast.info('Payment cancelled. Your seats stay held until the timer runs out.');
        return;
      }
      // The server checks Razorpay's signature before confirming anything.
      const { booking } = await api.post('/bookings/verify', response);
      navigate(`/bookings/${booking._id}`, { replace: true, state: { justBooked: true } });
    } catch (err) {
      toast.error(err.message);
      if (err.status === 409) {
        // Hold expired before checkout, or the seats were sold while paying (refund is automatic).
        setHold(null);
        reload();
      }
    } finally {
      payingRef.current = false;
      setPaying(false);
      setBusy(false);
    }
  };

  const changeSeats = async () => {
    setBusy(true);
    try {
      await api.delete(`/shows/${id}/lock`);
    } catch {
      /* the hold expires on its own anyway */
    }
    setHold(null);
    setBusy(false);
    reload();
  };

  const ordered = sortSeats(seats.layout, selected);
  const total = ordered.reduce((sum, s) => sum + priceOf(seats.layout, seats.prices, s), 0);

  return (
    <div className={hold ? 'pb-56 sm:pb-44' : 'pb-32'}>
      <ShowHeader show={show} live={live} />

      <div className="mx-auto max-w-5xl px-4 pt-8">
        {started ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-amber-200">
            This show has already started. Please pick another showtime.
          </p>
        ) : (
          <>
            <SeatLegend />
            <div className={`mt-8 transition-opacity ${hold ? 'opacity-60' : ''}`}>
              <SeatMap
                layout={seats.layout}
                prices={seats.prices}
                statusOf={statusOf}
                onToggle={toggle}
                disabled={Boolean(hold) || busy}
              />
            </div>
          </>
        )}
      </div>

      {hold && secondsLeft > 0 ? (
        <HoldSummary
          layout={seats.layout}
          prices={seats.prices}
          seats={hold.seats}
          secondsLeft={secondsLeft}
          onChangeSeats={changeSeats}
          onPay={pay}
          busy={busy}
          paying={paying}
        />
      ) : (
        ordered.length > 0 &&
        !started && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-400">
                  {ordered.length} seat{ordered.length > 1 ? 's' : ''}: <span className="text-zinc-200">{ordered.join(', ')}</span>
                </p>
                <p className="text-xl font-bold">{formatPrice(total)}</p>
              </div>
              <button
                onClick={holdSeats}
                disabled={busy}
                className="shrink-0 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {busy ? 'Holding seats…' : user ? 'Continue' : 'Sign in to continue'}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
