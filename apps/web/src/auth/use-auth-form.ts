import { zodResolver } from '@hookform/resolvers/zod';
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import type { z } from 'zod';
import { ApiError } from '../api/client';
import { useRequestError } from './request-error';

// The form policy both auth forms share (Architecture A11): touched/blur
// validation with correction feedback, focus on the first invalid field, and
// server field errors shown like local ones.
export function useAuthForm<Input extends FieldValues, Output>({
  schema,
  fields,
  defaultValues,
  action,
}: {
  schema: z.ZodType<Output, Input>;
  // In display order, for focusing the first invalid field.
  fields: readonly Path<Input>[];
  defaultValues: DefaultValues<Input>;
  action: (input: Output) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    // RHF also schedules a second focus in a timer; that can steal focus during
    // rapid correction/autofill. Focus once in the invalid-submit callback.
    shouldFocusError: false,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues,
  });
  const request = useRequestError();
  const submit = handleSubmit(
    async (input) => {
      if (request.blocked) return;
      request.clear();
      clearErrors();
      try {
        await action(input);
      } catch (error) {
        request.fail(error);
        if (error instanceof ApiError && error.kind === 'validation') {
          let focused = false;
          for (const field of fields) {
            const message = error.fields?.[field]?.[0];
            if (message) {
              setError(
                field,
                { type: 'server', message },
                { shouldFocus: !focused },
              );
              focused = true;
            }
          }
        }
      }
    },
    (invalid) => {
      const first = fields.find((field) => field in invalid);
      if (first) setFocus(first);
    },
  );
  return { register, errors, isSubmitting, request, submit };
}

export type AuthFormState = Pick<
  ReturnType<typeof useAuthForm>,
  'isSubmitting' | 'request' | 'submit'
>;
