import { Link, useParams, useSearchParams } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { useCity } from '../context/CityContext.jsx';
import DateStrip from '../components/DateStrip.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/Status.jsx';
import { ChevronLeftIcon, MapPinIcon } from '../components/icons.jsx';
import { formatPrice, formatRuntime, formatTime, upcomingDates } from '../lib/format.js';
import NotFound from './NotFound.jsx';

const DAYS_AHEAD = 7;

// Colour each showtime by how full it is, like BookMyShow's green / orange / red.
function availabilityStyle(availability) {
  if (availability > 0.5) return { cls: 'border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10', label: 'Available' };
  if (availability > 0.15) return { cls: 'border-amber-500/50 text-amber-300 hover:bg-amber-500/10', label: 'Filling fast' };
  if (availability > 0) return { cls: 'border-red-500/50 text-red-300 hover:bg-red-500/10', label: 'Almost full' };
  return { cls: 'pointer-events-none border-ink-700 text-zinc-600 line-through', label: 'Sold out' };
}

function ShowButton({ show }) {
  const { cls, label } = availabilityStyle(show.availability);
  return (
    <Link
      to={`/shows/${show._id}`}
      title={`${label} · from ${formatPrice(show.minPrice)}`}
      aria-disabled={show.availability === 0}
      className={`flex min-w-24 flex-col items-center rounded-lg border px-4 py-2 transition ${cls}`}
    >
      <span className="text-sm font-semibold">{formatTime(show.startTime)}</span>
      <span className="text-[11px] text-zinc-400">
        {show.format} · {show.screenName}
      </span>
    </Link>
  );
}

function TheatreRow({ theatre, shows }) {
  const minPrice = Math.min(...shows.map((s) => s.minPrice));
  return (
    <div className="flex flex-col gap-4 border-b border-ink-800 py-6 last:border-0 md:flex-row">
      <div className="md:w-72 md:shrink-0">
        <h3 className="font-semibold">{theatre.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-zinc-400">
          <MapPinIcon className="size-3.5" /> {theatre.address}
        </p>
        <p className="mt-1 text-xs text-zinc-500">Tickets from {formatPrice(minPrice)}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {shows.map((s) => (
          <ShowButton key={s._id} show={s} />
        ))}
      </div>
    </div>
  );
}

export default function Showtimes() {
  const { id } = useParams();
  const { city, openPicker } = useCity();
  const [params, setParams] = useSearchParams();

  const dates = upcomingDates(DAYS_AHEAD);
  const date = dates.includes(params.get('date')) ? params.get('date') : dates[0];

  const movieReq = useApi(`/movies/${id}`);
  const showsReq = useApi(city ? `/movies/${id}/shows?city=${encodeURIComponent(city)}&date=${date}` : null);

  if (movieReq.loading) return <Spinner className="py-40" />;
  if (movieReq.error?.status === 404 || movieReq.error?.status === 400) return <NotFound />;
  if (movieReq.error) return <ErrorState error={movieReq.error} onRetry={movieReq.reload} />;

  const { movie } = movieReq.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link to={`/movies/${movie._id}`} className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200">
        <ChevronLeftIcon className="size-4" /> Back to movie
      </Link>

      <div className="mt-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{movie.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {[movie.language, formatRuntime(movie.runtime), movie.genres.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="mt-6 border-y border-ink-800 py-4">
        <DateStrip dates={dates} value={date} onChange={(d) => setParams({ date: d }, { replace: true })} />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-zinc-400">
        <button onClick={openPicker} className="flex items-center gap-1 text-sm text-zinc-300 hover:text-white">
          <MapPinIcon className="size-4" /> Showing theatres in <span className="font-semibold">{city || 'your city'}</span>
          <span className="text-brand-400">(change)</span>
        </button>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><i className="inline-block size-2 rounded-full bg-emerald-400" /> Available</span>
          <span className="flex items-center gap-1.5"><i className="inline-block size-2 rounded-full bg-amber-400" /> Filling fast</span>
          <span className="flex items-center gap-1.5"><i className="inline-block size-2 rounded-full bg-red-400" /> Almost full</span>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-800 bg-ink-900 px-4 sm:px-6">
        {!city ? (
          <EmptyState title="Select a city to see showtimes">
            <button onClick={openPicker} className="font-semibold text-brand-400 hover:underline">
              Choose city
            </button>
          </EmptyState>
        ) : showsReq.error ? (
          <ErrorState error={showsReq.error} onRetry={showsReq.reload} />
        ) : !showsReq.data || showsReq.loading ? (
          <Spinner />
        ) : showsReq.data.theatres.length === 0 ? (
          <EmptyState title="No shows on this date">
            Try another date, or check a different city.
          </EmptyState>
        ) : (
          showsReq.data.theatres.map(({ theatre, shows }) => <TheatreRow key={theatre._id} theatre={theatre} shows={shows} />)
        )}
      </div>
    </div>
  );
}
