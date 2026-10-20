import { Component, type ReactNode } from 'react';
import styles from '../App.module.css';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (this.state.failed)
      return (
        <main className={styles.page}>
          <section className={styles.surface}>
            <h1>Something went wrong.</h1>
            <p role="alert">Reload the page to try again.</p>
            <button onClick={() => window.location.reload()}>
              Reload page
            </button>
          </section>
        </main>
      );
    return this.props.children;
  }
}
