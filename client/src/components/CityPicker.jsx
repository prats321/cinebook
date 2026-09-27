import { useEffect } from 'react';
import { useCity } from '../context/CityContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { MapPinIcon, XIcon } from './icons.jsx';
import { Spinner } from './Status.jsx';

export default function CityPicker() {
  const { city, setCity, pickerOpen, closePicker } = useCity();
  const { data, loading, error } = useApi(pickerOpen ? '/theatres/cities' : null);

  // Esc closes it, but only once a city has been chosen.
  useEffect(() => {
    if (!pickerOpen || !city) return;
    const onKey = (e) => e.key === 'Escape' && closePicker();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen, city, closePicker]);

  if (!pickerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => city && closePicker()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-picker-title"
        className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="city-picker-title" className="text-lg font-bold">
              Select your city
            </h2>
            <p className="text-sm text-zinc-400">We'll show movies and showtimes near you.</p>
          </div>
          {city && (
            <button onClick={closePicker} aria-label="Close" className="rounded-lg p-1 text-zinc-400 hover:bg-ink-700">
              <XIcon />
            </button>
          )}
        </div>

        {loading && <Spinner className="py-8" />}
        {error && <p className="mt-6 text-sm text-red-300">{error.message}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data?.cities.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition ${
                c === city
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-ink-700 hover:border-ink-600 hover:bg-ink-800'
              }`}
            >
              <MapPinIcon className="size-6" />
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
