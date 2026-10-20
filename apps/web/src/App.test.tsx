import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('foundation readiness', () => {
  it('requests API health and decodes the shared response contract', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: 'ok' })));
    vi.stubGlobal('fetch', fetch);
    renderApp();

    expect(await screen.findByText('The service is ready.')).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('offers recovery after the API is unavailable', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'unavailable' }), {
          status: 503,
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok' })));
    vi.stubGlobal('fetch', fetch);
    renderApp();

    expect(
      await screen.findByText('The service is unavailable. Try again.'),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('The service is ready.')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not treat an invalid API response as ready', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ healthy: true }))),
    );
    renderApp();

    expect(
      await screen.findByText('The service is unavailable. Try again.'),
    ).toBeTruthy();
  });
});
