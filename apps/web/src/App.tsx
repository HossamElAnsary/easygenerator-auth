import { Link, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AuthForm } from './auth/AuthForm';
import { ApplicationPage } from './auth/ApplicationPage';
import { SessionNotice } from './auth/SessionNotice';
import { Heading } from './ui/patterns';
import styles from './App.module.css';

function PublicPage({ signup }: { signup: boolean }) {
  const auth = useAuth();
  if (auth.status === 'authenticated') return <Navigate to="/app" replace />;
  if (!auth.hasResolved) return <SessionNotice />;
  return <AuthForm signup={signup} />;
}
function Home() {
  const auth = useAuth();
  return auth.status === 'authenticated' || auth.status === 'anonymous' ? (
    <Navigate
      to={auth.status === 'authenticated' ? '/app' : '/signin'}
      replace
    />
  ) : (
    <SessionNotice />
  );
}
export function App() {
  return (
    <AuthProvider>
      <main className={styles.page}>
        <section className={styles.surface}>
          <p className={styles.eyebrow}>Easy Generator</p>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/signup"
              element={<PublicPage key="signup" signup />}
            />
            <Route
              path="/signin"
              element={<PublicPage key="signin" signup={false} />}
            />
            <Route path="/app" element={<ApplicationPage />} />
            <Route
              path="*"
              element={
                <>
                  <Heading>Page not found</Heading>
                  <Link to="/">Return home</Link>
                </>
              }
            />
          </Routes>
        </section>
      </main>
    </AuthProvider>
  );
}
