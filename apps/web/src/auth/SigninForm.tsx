import { Link, useLocation, useNavigate } from 'react-router';
import { signinRequestSchema } from '@easy-generator/contracts';
import { Field, Notice, PasswordField } from '../ui/patterns';
import { AuthFormFrame } from './AuthFormFrame';
import { useAuth } from './AuthProvider';
import { useAuthForm } from './use-auth-form';

// Signup's navigation state; it is gone after a refresh, which is acceptable.
function createdAccount(state: unknown) {
  if (
    typeof state !== 'object' ||
    state === null ||
    !('created' in state) ||
    state.created !== true
  )
    return undefined;
  return {
    email:
      'email' in state && typeof state.email === 'string' ? state.email : '',
  };
}

export function SigninForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const created = createdAccount(useLocation().state);
  const { register, errors, ...form } = useAuthForm({
    schema: signinRequestSchema,
    fields: ['email', 'password'],
    defaultValues: { email: created?.email ?? '', password: '' },
    action: async (input) => {
      await auth.signin(input);
      void navigate('/app', { replace: true });
    },
  });
  return (
    <AuthFormFrame
      title="Sign in"
      description="Enter your email and password to continue."
      pendingLabel="Signing in…"
      form={form}
      notice={created && <Notice>Account created. Sign in to continue.</Notice>}
      footer={
        <>
          New here? <Link to="/signup">Create an account</Link>
        </>
      }
    >
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
        autoComplete="current-password"
        {...register('password')}
        error={errors.password?.message}
      />
    </AuthFormFrame>
  );
}
