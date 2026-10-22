import { Link, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { ApplicationPage } from './auth/ApplicationPage';
import { Home, PublicOnly } from './auth/guards';
import { SigninForm } from './auth/SigninForm';
import { SignupForm } from './auth/SignupForm';
import { Heading } from './ui/patterns';
import styles from './App.module.css';

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
              element={
                <PublicOnly>
                  <SignupForm />
                </PublicOnly>
              }
            />
            <Route
              path="/signin"
              element={
                <PublicOnly>
                  <SigninForm />
                </PublicOnly>
              }
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
