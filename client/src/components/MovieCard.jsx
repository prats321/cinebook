import { Link } from 'react-router';
import { StarIcon } from './icons.jsx';
import { formatDate } from '../lib/format.js';

export function Poster({ movie, className = '' }) {
  return movie.posterUrl ? (
    <img
      src={movie.posterUrl}
      alt={`${movie.title} poster`}
      loading="lazy"
      className={`aspect-[2/3] w-full object-cover ${className}`}
    />
  ) : (
    <div className={`grid aspect-[2/3] w-full place-items-center bg-ink-800 p-4 text-center text-sm font-semibold text-zinc-400 ${className}`}>
      {movie.title}
    </div>
  );
}

export default function MovieCard({ movie, upcoming = false }) {
  return (
    <Link to={`/movies/${movie._id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-ink-800 ring-1 ring-ink-700 transition group-hover:ring-brand-500/60">
        <Poster movie={movie} className="transition duration-300 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-8 text-xs font-semibold">
          {upcoming ? (
            <span className="text-zinc-200">Releasing {formatDate(movie.releaseDate)}</span>
          ) : (
            movie.rating > 0 && (
              <span className="flex items-center gap-1">
                <StarIcon className="size-3.5 text-brand-500" />
                {movie.rating}/10
              </span>
            )
          )}
        </div>
      </div>
      <h3 className="mt-2 truncate font-semibold group-hover:text-brand-400">{movie.title}</h3>
      <p className="truncate text-sm text-zinc-400">
        {[movie.language, movie.genres?.slice(0, 2).join('/')].filter(Boolean).join(' · ')}
      </p>
    </Link>
  );
}
