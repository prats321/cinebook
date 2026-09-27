export function Spinner({ className = '' }) {
  return (
    <div role="status" className={`flex justify-center py-16 ${className}`}>
      <div className="size-8 animate-spin rounded-full border-2 border-ink-600 border-t-brand-500" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-semibold text-red-300">Something went wrong</p>
      <p className="mt-1 text-sm text-zinc-400">{error?.message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-ink-700 px-4 py-2 text-sm font-medium hover:bg-ink-600"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-zinc-400">{children}</div>}
    </div>
  );
}
