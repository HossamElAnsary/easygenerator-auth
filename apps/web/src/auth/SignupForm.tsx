import { Link, useNavigate } from 'react-router';
import { signupRequestSchema } from '@easy-generator/contracts';
import { Field, PasswordField } from '../ui/patterns';
import { AuthFormFrame } from './AuthFormFrame';
import { useAuth } from './AuthProvider';
import { useAuthForm } from './use-auth-form';

export function SignupForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { register, errors, ...form } = useAuthForm({
    schema: signupRequestSchema,
    fields: ['name', 'email', 'password'],
    defaultValues: { name: '', email: '', password: '' },
    action: async (input) => {
      const user = await auth.signup(input);
      // Signin prefills the normalized email; the password never travels.
      void navigate('/signin', {
        replace: true,
        state: { created: true, email: user.email },
      });
    },
  });
  return (
    <AuthFormFrame
      title="Create an account"
      description="Enter your details to get started."
      pendingLabel="Creating account…"
      form={form}
      footer={
        <>
          Already have an account? <Link to="/signin">Sign in</Link>
        </>
      }
    >
      <Field
        id="name"
        label="Name"
        autoComplete="name"
        {...register('name')}
        error={errors.name?.message}
      />
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
        autoComplete="new-password"
        hint={
          <>
            <span>Use 8–128 characters, including:</span>
            <ul>
              <li>At least one letter</li>
              <li>At least one number</li>
              <li>At least one special character</li>
            </ul>
          </>
        }
        {...register('password')}
        error={errors.password?.message}
      />
    </AuthFormFrame>
  );
}
