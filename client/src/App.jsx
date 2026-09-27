import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <main className="grid min-h-screen place-items-center">
          <h1 className="text-4xl font-extrabold">
            Cine<span className="text-brand-500">Book</span>
          </h1>
        </main>
      </AuthProvider>
    </ToastProvider>
  );
}
