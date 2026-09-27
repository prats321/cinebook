import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import { CityProvider } from './context/CityContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
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
