import { useQuery } from '@tanstack/react-query';
import { Link, Route, Routes } from 'react-router';
import { fetchHealth } from './health';
import styles from './App.module.css';

function FoundationPage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    retry: false,
    networkMode: 'always',
  });
  const unavailable = health.isError || health.data?.status === 'unavailable';
  const message = health.isFetching
    ? 'Checking the service…'
    : unavailable
      ? 'The service is unavailable. Try again.'
      : 'The service is ready.';

  return (
    <section className={styles.surface} aria-labelledby="page-title">
      <p className={styles.eyebrow}>Easy Generator</p>
      <h1 id="page-title">Application foundation</h1>
      <p className={styles.description}>
        The workspace is set up. Account creation and sign in are coming in the
        next milestones.
      </p>
      <p className={styles.status} role="status" aria-live="polite">
        {message}
      </p>
      {unavailable && (
        <button
          type="button"
          disabled={health.isFetching}
          onClick={() => void health.refetch()}
        >
          {health.isFetching ? 'Checking…' : 'Retry'}
        </button>
      )}
    </section>
  );
}

export function App() {
  return (
    <main className={styles.page}>
      <Routes>
        <Route path="/" element={<FoundationPage />} />
        <Route
          path="*"
          element={
            <section className={styles.surface}>
              <h1>Page not found</h1>
              <Link to="/">Return home</Link>
            </section>
          }
        />
      </Routes>
    </main>
  );
}
