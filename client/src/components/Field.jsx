export default function Field({ label, error, id, className = '', ...inputProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-lg border bg-ink-800 px-3 py-2.5 text-sm placeholder:text-zinc-500 focus:outline-none ${
          error ? 'border-red-500/60' : 'border-ink-700 focus:border-ink-600'
        }`}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
