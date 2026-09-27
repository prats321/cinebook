import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import MovieCard from '../components/MovieCard.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/Status.jsx';
import { SearchIcon } from '../components/icons.jsx';

const PAGE_SIZE = 18;
const TABS = [
  { value: '', label: 'All' },
  { value: 'now_showing', label: 'Now showing' },
  { value: 'upcoming', label: 'Coming soon' },
];

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
        active ? 'border-brand-500 bg-brand-500/15 text-brand-400' : 'border-ink-700 text-zinc-300 hover:border-ink-600'
      }`}
    >
      {children}
    </button>
  );
}

function FilterRow({ label, options, value, onChange }) {
  if (!options?.length) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm text-zinc-500">{label}</span>
      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {options.map((o) => (
          <Chip key={o} active={value === o} onClick={() => onChange(value === o ? '' : o)}>
            {o}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export default function Movies() {
  // All filters live in the URL, so results can be shared, bookmarked and survive a refresh.
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const genre = params.get('genre') || '';
  const language = params.get('language') || '';
  const page = Number(params.get('page')) || 1;
  const urlSearch = params.get('search') || '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput);

  // Keep the box in sync when the navbar search changes the URL.
  useEffect(() => setSearchInput(urlSearch), [urlSearch]);

  const update = (changes) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, val] of Object.entries(changes)) {
          if (val) next.set(key, val);
          else next.delete(key);
        }
        if (!('page' in changes)) next.delete('page'); // new filters start from page 1
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (debouncedSearch.trim() !== urlSearch) update({ search: debouncedSearch.trim() });
  }, [debouncedSearch]); // only react to the user pausing, not to every URL change

  const query = new URLSearchParams({ limit: PAGE_SIZE, page });
  if (status) query.set('status', status);
  if (genre) query.set('genre', genre);
  if (language) query.set('language', language);
  if (urlSearch) query.set('search', urlSearch);

  const { data, loading, error, reload } = useApi(`/movies?${query}`);
  const filters = useApi('/movies/filters');
  const hasFilters = Boolean(status || genre || language || urlSearch);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Movies</h1>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title"
              aria-label="Search by title"
              className="w-full rounded-lg border border-ink-700 bg-ink-800 py-2.5 pl-9 pr-3 text-sm placeholder:text-zinc-500 focus:border-ink-600 focus:outline-none"
            />
          </div>
          <div role="tablist" className="flex rounded-lg border border-ink-700 bg-ink-900 p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={status === t.value}
                onClick={() => update({ status: t.value })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  status === t.value ? 'bg-ink-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <FilterRow label="Language" options={filters.data?.languages} value={language} onChange={(v) => update({ language: v })} />
        <FilterRow label="Genre" options={filters.data?.genres} value={genre} onChange={(v) => update({ genre: v })} />
      </div>

      <div className="mt-8">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data ? (
          <Spinner />
        ) : data.movies.length === 0 ? (
          <EmptyState title="No movies found">
            {hasFilters && (
              <button onClick={() => setParams({}, { replace: true })} className="font-semibold text-brand-400 hover:underline">
                Clear all filters
              </button>
            )}
          </EmptyState>
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-500">
              {data.total} movie{data.total === 1 ? '' : 's'}
            </p>
            <div className={`grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${loading ? 'opacity-50' : ''}`}>
              {data.movies.map((m) => (
                <MovieCard key={m._id} movie={m} upcoming={new Date(m.releaseDate) > new Date()} />
              ))}
            </div>

            {data.totalPages > 1 && (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3 text-sm">
                <button
                  disabled={page <= 1}
                  onClick={() => update({ page: page - 1 })}
                  className="rounded-lg border border-ink-700 px-4 py-2 hover:bg-ink-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-zinc-400">
                  Page {page} of {data.totalPages}
                </span>
                <button
                  disabled={page >= data.totalPages}
                  onClick={() => update({ page: page + 1 })}
                  className="rounded-lg border border-ink-700 px-4 py-2 hover:bg-ink-800 disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
