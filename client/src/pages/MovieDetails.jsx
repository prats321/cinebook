import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { Poster } from '../components/MovieCard.jsx';
import TrailerModal from '../components/TrailerModal.jsx';
import { ErrorState, Spinner } from '../components/Status.jsx';
import { PlayIcon, StarIcon, TicketIcon, UserIcon } from '../components/icons.jsx';
import { formatLongDate, formatRuntime } from '../lib/format.js';
import NotFound from './NotFound.jsx';

function CastMember({ person }) {
  return (
    <div className="w-24 shrink-0 text-center sm:w-28">
      <div className="mx-auto size-20 overflow-hidden rounded-full bg-ink-800 ring-1 ring-ink-700 sm:size-24">
        {person.profileUrl ? (
          <img src={person.profileUrl} alt={person.name} loading="lazy" className="size-full object-cover" />
        ) : (
          <UserIcon className="m-auto size-full p-6 text-zinc-600" />
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium">{person.name}</p>
      {person.character && <p className="line-clamp-2 text-xs text-zinc-500">as {person.character}</p>}
    </div>
  );
}

export default function MovieDetails() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(`/movies/${id}`);
  const [showTrailer, setShowTrailer] = useState(false);

  if (loading) return <Spinner className="py-40" />;
  if (error?.status === 404 || error?.status === 400) return <NotFound />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { movie } = data;
  const released = !movie.releaseDate || new Date(movie.releaseDate) <= new Date();

  return (
    <>
      <section className="relative isolate overflow-hidden">
        {movie.backdropUrl && (
          <img src={movie.backdropUrl} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-35" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 to-transparent" />

        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-end sm:py-16">
          <div className="relative w-44 shrink-0 self-center overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 sm:w-60 sm:self-auto">
            <Poster movie={movie} />
            {movie.trailerKey && (
              <button
                onClick={() => setShowTrailer(true)}
                className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition hover:bg-black/50 hover:opacity-100 focus-visible:opacity-100"
                aria-label="Play trailer"
              >
                <PlayIcon className="size-12" />
              </button>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{movie.title}</h1>

            {movie.rating > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
                <StarIcon className="size-5 text-brand-500" />
                <span className="font-bold">{movie.rating}/10</span>
                <span className="text-sm text-zinc-400">on TMDB</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {[movie.language, ...movie.genres].filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-md bg-ink-800/80 px-2.5 py-1 text-sm text-zinc-300">
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-4 text-zinc-300">
              {[formatRuntime(movie.runtime), movie.releaseDate && formatLongDate(movie.releaseDate)]
                .filter(Boolean)
                .join(' · ')}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {released ? (
                <Link
                  to={`/movies/${movie._id}/shows`}
                  className="flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600"
                >
                  <TicketIcon className="size-5" /> Book tickets
                </Link>
              ) : (
                <span className="rounded-lg border border-ink-600 px-6 py-3 font-semibold text-zinc-300">
                  Releasing {formatLongDate(movie.releaseDate)}
                </span>
              )}
              {movie.trailerKey && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 font-semibold backdrop-blur hover:bg-white/20"
                >
                  <PlayIcon className="size-4" /> Watch trailer
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4">
        {movie.overview && (
          <section className="max-w-3xl pt-8">
            <h2 className="text-xl font-bold">About the movie</h2>
            <p className="mt-3 leading-relaxed text-zinc-300">{movie.overview}</p>
          </section>
        )}

        {movie.cast?.length > 0 && (
          <section className="pt-10">
            <h2 className="text-xl font-bold">Cast</h2>
            <div className="scrollbar-none -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2">
              {movie.cast.map((person) => (
                <CastMember key={`${person.name}-${person.character}`} person={person} />
              ))}
            </div>
          </section>
        )}
      </div>

      {showTrailer && (
        <TrailerModal videoKey={movie.trailerKey} title={movie.title} onClose={() => setShowTrailer(false)} />
      )}
    </>
  );
}
