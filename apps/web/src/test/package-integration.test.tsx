import { zodResolver } from '@hookform/resolvers/zod';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { expect, it, vi } from 'vitest';
import { z } from 'zod';

// A package-compatibility fixture, not an application form or authentication policy.
const fixtureSchema = z.strictObject({
  value: z.string().trim().min(3, 'Enter at least 3 characters.'),
});
type FixtureOutput = z.output<typeof fixtureSchema>;

function PackageFixture({
  submit,
}: {
  submit: (value: FixtureOutput) => Promise<void>;
}) {
  const probe = useQuery({
    queryKey: ['package-probe'],
    queryFn: () => Promise.resolve('Connected'),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof fixtureSchema>, unknown, FixtureOutput>({
    resolver: zodResolver(fixtureSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <p>{probe.data}</p>
      <label htmlFor="fixture-value">Value</label>
      <input id="fixture-value" {...register('value')} />
      {errors.value && <p role="alert">{errors.value.message}</p>}
      <button disabled={isSubmitting}>
        {isSubmitting ? 'Submitting' : 'Submit'}
      </button>
    </form>
  );
}

it('integrates React Hook Form, Zod output transforms, awaited submission, and Query', async () => {
  let completeSubmission: (() => void) | undefined;
  const submit = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        completeSubmission = resolve;
      }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <PackageFixture submit={submit} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();

  expect(await screen.findByText('Connected')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'Enter at least 3 characters.',
  );
  expect(submit).not.toHaveBeenCalled();

  await user.type(screen.getByLabelText('Value'), '  sample  ');
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  expect(submit).toHaveBeenCalledWith({ value: 'sample' }, expect.anything());
  expect(screen.getByRole('button', { name: 'Submitting' })).toHaveProperty(
    'disabled',
    true,
  );
  expect(client.getMutationCache().getAll()).toHaveLength(0);

  completeSubmission?.();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty(
      'disabled',
      false,
    ),
  );
});
