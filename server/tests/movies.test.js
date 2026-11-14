import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';
import { createMovie, createShow, createTheatre } from './fixtures.js';

let ctx;
let api;
let released;
before(async () => {
  ctx = await startTestServer();
  api = ctx.api;
  released = await createMovie({ title: 'Now Playing Movie', language: 'Hindi', genres: ['Action', 'Drama'] });
  await createMovie({ title: 'Future Movie', language: 'Tamil', genres: ['Comedy'], releaseDate: new Date(Date.now() + 10 * 86_400_000) });
  await createMovie({ title: 'Hidden Movie', isActive: false });
});
after(() => ctx.stop());

describe('movies', () => {
  it('splits now showing and upcoming by release date, hiding inactive movies', async () => {
    const now = await api.get('/movies?status=now_showing');
    const soon = await api.get('/movies?status=upcoming');
    assert.deepEqual(now.json.movies.map((m) => m.title), ['Now Playing Movie']);
    assert.deepEqual(soon.json.movies.map((m) => m.title), ['Future Movie']);
  });

  it('searches titles case-insensitively and treats regex characters literally', async () => {
    assert.equal((await api.get('/movies?search=PLAYING')).json.total, 1);
    assert.equal((await api.get(`/movies?search=${encodeURIComponent('.*')}`)).json.total, 0);
  });

  it('filters by genre and language and exposes the available filters', async () => {
    assert.equal((await api.get('/movies?genre=Comedy')).json.movies[0].title, 'Future Movie');
    assert.equal((await api.get('/movies?language=Hindi')).json.total, 1);
    const filters = await api.get('/movies/filters');
    assert.deepEqual(filters.json.languages, ['Hindi', 'Tamil']);
    assert.ok(filters.json.genres.includes('Drama'));
  });

  it('paginates', async () => {
    const page = await api.get('/movies?limit=1&page=2');
    assert.equal(page.json.movies.length, 1);
    assert.equal(page.json.totalPages, 2);
  });

  it('groups a day of showtimes by theatre with price and availability', async () => {
    const theatre = await createTheatre({ name: 'Grouping Cinema' });
    const { show } = await createShow({ movie: released, theatre, hoursFromNow: 30 });
    const date = new Date(show.startTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const res = await api.get(`/movies/${released._id}/shows?city=Pune&date=${date}`);
    assert.equal(res.status, 200);
    const entry = res.json.theatres.find((t) => t.theatre.name === 'Grouping Cinema');
    assert.equal(entry.shows.length, 1);
    assert.equal(entry.shows[0].minPrice, 200);
    assert.equal(entry.shows[0].availability, 1);
  });

  it('never lists shows that already started, and validates the query', async () => {
    const { show } = await createShow({ movie: released, hoursFromNow: -1 });
    const date = new Date(show.startTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const res = await api.get(`/movies/${released._id}/shows?city=Pune&date=${date}`);
    assert.ok(!res.json.theatres.some((t) => t.shows.some((s) => s._id === show.id)));
    assert.equal((await api.get(`/movies/${released._id}/shows?city=Pune&date=tomorrow`)).status, 400);
    assert.equal((await api.get(`/movies/${released._id}/shows`)).status, 400);
  });

  it('lists cities that have theatres', async () => {
    const res = await api.get('/theatres/cities');
    assert.deepEqual(res.json.cities, ['Pune']);
  });
});
