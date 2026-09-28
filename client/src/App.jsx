import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import { CityProvider } from './context/CityContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Movies from './pages/Movies.jsx';
import MovieDetails from './pages/MovieDetails.jsx';
import Showtimes from './pages/Showtimes.jsx';
import SeatSelection from './pages/SeatSelection.jsx';
import MyBookings from './pages/MyBookings.jsx';
import Ticket from './pages/Ticket.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'movies', element: <Movies /> },
      { path: 'movies/:id', element: <MovieDetails /> },
      { path: 'movies/:id/shows', element: <Showtimes /> },
      { path: 'shows/:id', element: <SeatSelection /> },
      { path: 'bookings', element: <RequireAuth><MyBookings /></RequireAuth> },
      { path: 'bookings/:id', element: <RequireAuth><Ticket /></RequireAuth> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CityProvider>
          <RouterProvider router={router} />
        </CityProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
