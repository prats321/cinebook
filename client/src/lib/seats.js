export const MAX_SEATS = 10; // matches the API limit

export const CATEGORY_LABELS = { RECLINER: 'Recliner', PREMIUM: 'Premium', NORMAL: 'Classic' };

// "C12" -> { row: 'C', number: 12 }
export function parseSeat(seatId) {
  const match = /^([A-Z]{1,2})(\d{1,2})$/.exec(seatId);
  return match ? { row: match[1], number: Number(match[2]) } : null;
}

export function categoryOf(layout, seatId) {
  const parsed = parseSeat(seatId);
  return layout.find((r) => r.label === parsed?.row)?.category;
}

export const priceOf = (layout, prices, seatId) => prices[categoryOf(layout, seatId)] ?? 0;

// Sort seats the way a ticket prints them: by row order in the layout, then seat number.
export function sortSeats(layout, seats) {
  const rowIndex = Object.fromEntries(layout.map((r, i) => [r.label, i]));
  return [...seats].sort((a, b) => {
    const pa = parseSeat(a);
    const pb = parseSeat(b);
    return rowIndex[pa.row] - rowIndex[pb.row] || pa.number - pb.number;
  });
}

// Consecutive rows with the same category form one priced section.
export function groupRows(layout) {
  const groups = [];
  for (const row of layout) {
    const last = groups.at(-1);
    if (last?.category === row.category) last.rows.push(row);
    else groups.push({ category: row.category, rows: [row] });
  }
  return groups;
}
