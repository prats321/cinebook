// Small, predictable data sets built straight through the models, so each test
// knows exactly which seats exist and what they cost.

export const LAYOUT = [
  { label: 'A', category: 'RECLINER', seats: 8 },
  { label: 'C', category: 'PREMIUM', seats: 12 },
  { label: 'F', category: 'NORMAL', seats: 14 },
];
export const PRICES = { RECLINER: 450, PREMIUM: 280, NORMAL: 200 };

let counter = 0;

export async function createMovie(overrides = {}) {
  const { Movie } = await import('../src/models/Movie.js');
  counter++;
  return Movie.create({
    title: `Test Movie ${counter}`,
    genres: ['Action'],
    language: 'Hindi',
    runtime: 150,
    rating: 7.5,
    releaseDate: new Date(Date.now() - 7 * 86_400_000),
    ...overrides,
  });
}

export async function createTheatre(overrides = {}) {
  const { Theatre } = await import('../src/models/Theatre.js');
  counter++;
  return Theatre.create({
    name: `Test Cinema ${counter}`,
    city: 'Pune',
    address: 'Test Road, Pune',
    screens: [{ name: 'Audi 1', rows: LAYOUT }],
    ...overrides,
  });
}

// A show starting `hoursFromNow` hours from now (defaults to tomorrow).
export async function createShow({ hoursFromNow = 24, movie, theatre } = {}) {
  const { Show } = await import('../src/models/Show.js');
  movie ??= await createMovie();
  theatre ??= await createTheatre();
  const screen = theatre.screens[0];
  const startTime = new Date(Date.now() + hoursFromNow * 3_600_000);
  const show = await Show.create({
    movie: movie._id,
    theatre: theatre._id,
    screenId: screen._id,
    screenName: screen.name,
    city: theatre.city,
    startTime,
    endTime: new Date(startTime.getTime() + movie.runtime * 60_000),
    language: movie.language,
    prices: PRICES,
    layout: screen.rows,
  });
  return { show, movie, theatre, id: show._id.toString() };
}
