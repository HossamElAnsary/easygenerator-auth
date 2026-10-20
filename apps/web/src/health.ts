import {
  healthResponseSchema,
  type HealthResponse,
} from '@easy-generator/contracts';

export async function fetchHealth(
  signal: AbortSignal,
): Promise<HealthResponse> {
  const response = await fetch('/api/health', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });

  if (!response.ok) {
    throw new Error('The service is unavailable.');
  }

  return healthResponseSchema.parse(await response.json());
}
