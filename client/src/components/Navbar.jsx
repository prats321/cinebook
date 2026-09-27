import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useCity } from '../context/CityContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ChevronDownIcon, MapPinIcon, SearchIcon } from './icons.jsx';

export function Logo() {
  return (
    <Link to="/" className="text-xl font-extrabold tracking-tight">
      Cine<span className="text-brand-500">Book</span>
    </Link>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/movies?search=${encodeURIComponent(q)}` : '/movies');
  };

  return (
    <form onSubmit={onSubmit} role="search" className="relative hidden flex-1 md:block md:max-w-md">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for movies"
        aria-label="Search for movies"
        className="w-full rounded-lg border border-ink-700 bg-ink-800 py-2 pl-9 pr-3 text-sm placeholder:text-zinc-500 focus:border-ink-600 focus:outline-none"
      />
    </form>
  );
}

function UserMenu() {
  const { user, loading, logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  if (loading) return <div className="size-9" />;

  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Sign in
      </Link>
    );
  }

  const onLogout = async () => {
    setOpen(false);
    await logout();
    toast.info('Signed out');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-800"
      >
        <span className="grid size-8 place-items-center rounded-full bg-brand-500/15 font-semibold text-brand-400">
          {user.name[0].toUpperCase()}
        </span>
        <span className="hidden max-w-28 truncate sm:block">Hi, {user.name.split(' ')[0]}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-xl">
            <div className="border-b border-ink-700 px-4 py-3">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-zinc-400">{user.email}</p>
            </div>
            <button onClick={onLogout} className="w-full px-4 py-2.5 text-left text-sm hover:bg-ink-800">
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Navbar() {
  const { city, openPicker } = useCity();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Logo />
        <SearchBox />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link to="/movies" aria-label="Search movies" className="rounded-lg p-2 text-zinc-300 hover:bg-ink-800 md:hidden">
            <SearchIcon />
          </Link>
          <button
            onClick={openPicker}
            className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-zinc-300 hover:bg-ink-800"
          >
            <MapPinIcon className="size-4" />
            <span className="max-w-24 truncate">{city || 'Select city'}</span>
            <ChevronDownIcon className="size-4" />
          </button>
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
