import { Link } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import MovieCard from '../components/MovieCard.jsx';
import { ErrorState, Spinner } from '../components/Status.jsx';
import { StarIcon, TicketIcon } from '../components/icons.jsx';
import { formatRuntime } from '../lib/format.js';

function Hero({ movie }) {
  return (
    <section className="relative isolate overflow-hidden">
      {movie.backdropUrl && (
        <img src={movie.backdropUrl} alt="" className="absolute inset-0 -z-10 size-full object-cover object-top opacity-60" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/80 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />

      <div className="mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-end px-4 pb-12 pt-24 sm:min-h-[32rem]">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">Featured</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">{movie.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-300">
          {movie.rating > 0 && (
            <span className="flex items-center gap-1 font-semibold">
              <StarIcon className="size-4 text-brand-500" /> {movie.rating}/10
            </span>
          )}
          <span>{formatRuntime(movie.runtime)}</span>
          <span>{movie.genres.slice(0, 3).join(', ')}</span>
          <span>{movie.language}</span>
        </div>
        <p className="mt-4 line-clamp-3 max-w-xl text-zinc-300">{movie.overview}</p>
        <div className="mt-6 flex gap-3">
          <Link
            to={`/movies/${movie._id}/shows`}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600"
          >
            <TicketIcon className="size-5" /> Book tickets
          </Link>
          <Link to={`/movies/${movie._id}`} className="rounded-lg bg-white/10 px-5 py-2.5 font-semibold backdrop-blur hover:bg-white/20">
            More info
          </Link>
        </div>
      </div>
    </section>
  );
}

function Section({ title, link, children }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        {link && (
          <Link to={link} className="text-sm font-semibold text-brand-400 hover:underline">
            See all
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const nowShowing = useApi('/movies?status=now_showing&limit=12');
  const upcoming = useApi('/movies?status=upcoming&limit=10');

  if (nowShowing.loading && !nowShowing.data) return <Spinner className="py-40" />;
  if (nowShowing.error) return <ErrorState error={nowShowing.error} onRetry={nowShowing.reload} />;

  const movies = nowShowing.data.movies;
  // Feature the best-rated movie that has a backdrop image.
  const featured = [...movies].filter((m) => m.backdropUrl).sort((a, b) => b.rating - a.rating)[0];

  return (
    <>
      {featured && <Hero movie={featured} />}

      <Section title="Now showing" link="/movies?status=now_showing">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      </Section>

      {upcoming.data?.movies.length > 0 && (
        <Section title="Coming soon" link="/movies?status=upcoming">
          <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
            {upcoming.data.movies.map((m) => (
              <div key={m._id} className="w-36 shrink-0 snap-start sm:w-44">
                <MovieCard movie={m} upcoming />
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
