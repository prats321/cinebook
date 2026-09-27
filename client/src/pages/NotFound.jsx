import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-500">404</p>
      <h1 className="mt-4 text-2xl font-bold">This show isn't playing</h1>
      <p className="mt-2 text-zinc-400">The page you're looking for doesn't exist or has moved.</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600"
      >
        Back to home
      </Link>
    </div>
  );
}
