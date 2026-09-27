const STYLES = {
  CONFIRMED: 'bg-emerald-500/15 text-emerald-300',
  CANCELLED: 'bg-zinc-500/15 text-zinc-300',
  FAILED: 'bg-red-500/15 text-red-300',
  PENDING: 'bg-amber-500/15 text-amber-300',
};

const LABELS = { CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled', FAILED: 'Failed', PENDING: 'Pending' };

export default function BookingStatus({ status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
