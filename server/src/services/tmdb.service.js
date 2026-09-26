import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

async function tmdbFetch(path, params = {}) {
  if (!env.tmdbToken) throw new AppError('TMDB_READ_TOKEN is not configured', 500);

  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.tmdbToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) throw new AppError('Movie not found on TMDB', 404);
  if (!res.ok) throw new AppError(`TMDB request failed (${res.status})`, 502);
  return res.json();
}

const imageUrl = (path, size) => (path ? `${IMG}/${size}${path}` : undefined);

function languageName(code) {
  try {
    return languageNames.of(code);
  } catch {
    return code;
  }
}

// Shape a TMDB movie (with credits + videos appended) into our Movie model.
function toMovie(data) {
  const trailer =
    data.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
    data.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer');

  return {
    tmdbId: data.id,
    title: data.title,
    overview: data.overview,
    posterUrl: imageUrl(data.poster_path, 'w500'),
    backdropUrl: imageUrl(data.backdrop_path, 'w1280'),
    releaseDate: data.release_date ? new Date(data.release_date) : undefined,
    runtime: data.runtime || 150,
    genres: (data.genres || []).map((g) => g.name),
    language: languageName(data.original_language),
    rating: Math.round((data.vote_average || 0) * 10) / 10,
    trailerKey: trailer?.key,
    cast: (data.credits?.cast || []).slice(0, 10).map((c) => ({
      name: c.name,
      character: c.character,
      profileUrl: imageUrl(c.profile_path, 'w185'),
    })),
  };
}

export async function getMovieDetails(tmdbId) {
  const data = await tmdbFetch(`/movie/${tmdbId}`, { append_to_response: 'credits,videos' });
  return toMovie(data);
}

export async function searchMovies(query) {
  const data = await tmdbFetch('/search/movie', { query, include_adult: 'false' });
  return data.results.slice(0, 10).map((m) => ({
    tmdbId: m.id,
    title: m.title,
    releaseDate: m.release_date,
    posterUrl: imageUrl(m.poster_path, 'w185'),
  }));
}

// list: 'now_playing' | 'upcoming'. Returns TMDB ids for the Indian region.
export async function listMovieIds(list, limit = 10) {
  const data = await tmdbFetch(`/movie/${list}`, { region: 'IN' });
  return data.results.slice(0, limit).map((m) => m.id);
}
