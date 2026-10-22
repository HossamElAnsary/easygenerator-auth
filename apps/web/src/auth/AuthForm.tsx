import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  signupRequestSchema,
  signinRequestSchema,
  type SignupRequest,
  type ParsedSignupRequest,
  type SigninRequest,
  type ParsedSigninRequest,
} from '@easy-generator/contracts';
import { ApiError } from '../api/client';
import {
  Alert,
  Field,
  Heading,
  Notice,
  PasswordField,
  errorMessage,
  useRequestError,
} from '../ui/patterns';
import { useAuth } from './AuthProvider';
import { SessionNotice } from './SessionNotice';
import styles from '../App.module.css';

// The two schemas have the same input/output field types; signup additionally requires name.
// Each page owns its RHF instance and uses the exact route-specific shared resolver.
export function AuthForm({ signup }: { signup: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state: unknown = location.state;
  const created =
    !signup &&
    typeof state === 'object' &&
    state !== null &&
    'created' in state &&
    state.created === true;
  const email =
    created && 'email' in state && typeof state.email === 'string'
      ? state.email
      : '';
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<
    SignupRequest | SigninRequest,
    unknown,
    ParsedSignupRequest | ParsedSigninRequest
  >({
    // Name is unregistered on signin, so strict signin parsing sees only its two fields.
    resolver: zodResolver<
      SignupRequest | SigninRequest,
      unknown,
      ParsedSignupRequest | ParsedSigninRequest
    >(signup ? signupRequestSchema : signinRequestSchema),
    // RHF also schedules a second focus in a timer; that can steal focus during
    // rapid correction/autofill. Focus once in the invalid-submit callback.
    shouldFocusError: false,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { email, password: '', ...(signup ? { name: '' } : {}) },
  });
  const request = useRequestError();
  const submit = handleSubmit(
    async (input) => {
      if (request.blocked) return;
      request.clear();
      clearErrors();
      try {
        if (signup) {
          if (!('name' in input)) throw new ApiError('request');
          const user = await auth.signup(input);
          void navigate('/signin', {
            replace: true,
            state: { created: true, email: user.email },
          });
        } else {
          await auth.signin(input);
          void navigate('/app', { replace: true });
        }
      } catch (error) {
        request.fail(error);
        if (error instanceof ApiError && error.kind === 'validation') {
          let focused = false;
          for (const field of (signup
            ? ['name', 'email', 'password']
            : ['email', 'password']) as (keyof SignupRequest)[]) {
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
      const fields: (keyof SignupRequest)[] = signup
        ? ['name', 'email', 'password']
        : ['email', 'password'];
      const first = fields.find((field) => field in invalid);
      if (first) setFocus(first);
    },
  );
  const title = signup ? 'Create an account' : 'Sign in';
  return (
    <>
      <Heading>{title}</Heading>
      <p className={styles.description}>
        {signup
          ? 'Enter your details to get started.'
          : 'Enter your email and password to continue.'}
      </p>
      <SessionNotice />
      {created && <Notice>Account created. Sign in to continue.</Notice>}
      {auth.expired && (
        <Notice>Your session has expired. Please sign in again.</Notice>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          if (isSubmitting) {
            event.preventDefault();
            return;
          }
          void submit(event);
        }}
        aria-busy={isSubmitting}
        onChange={request.clear}
      >
        {signup && (
          <Field
            id="name"
            label="Name"
            autoComplete="name"
            {...register('name')}
            error={'name' in errors ? errors.name?.message : undefined}
          />
        )}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          {...register('email')}
          error={errors.email?.message}
        />
        <PasswordField
          id="password"
          signup={signup}
          {...register('password')}
          error={errors.password?.message}
        />
        {request.error != null && <Alert>{errorMessage(request.error)}</Alert>}
        <button
          className={styles.primary}
          type="submit"
          disabled={isSubmitting || request.blocked}
        >
          {isSubmitting
            ? signup
              ? 'Creating account…'
              : 'Signing in…'
            : title}
        </button>
      </form>
      <p className={styles.footer}>
        {signup ? 'Already have an account? ' : 'New here? '}
        <Link to={signup ? '/signin' : '/signup'}>
          {signup ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </>
  );
}
