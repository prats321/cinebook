export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-ink-700 bg-ink-900/80 p-6 shadow-2xl backdrop-blur sm:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-400">{footer}</p>
      </div>
    </div>
  );
}
