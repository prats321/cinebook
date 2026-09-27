import { Outlet, ScrollRestoration } from 'react-router';
import Navbar, { Logo } from './Navbar.jsx';
import CityPicker from './CityPicker.jsx';

function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-800">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row">
        <Logo />
        <p>
          Movie data from{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="text-zinc-300 hover:underline">
            TMDB
          </a>
          . Built with the MERN stack.
        </p>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CityPicker />
      <ScrollRestoration />
    </div>
  );
}
