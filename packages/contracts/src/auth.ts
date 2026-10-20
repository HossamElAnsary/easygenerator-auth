import { z } from 'zod';

// Architecture A04. Lengths are Unicode code points, not UTF-16 code units.
export const EMAIL_MAX_LENGTH = 254;
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const LONE_SURROGATE = /\p{Cs}/u;
const LETTER = /\p{L}/u;
const DECIMAL_DIGIT = /\p{Nd}/u;
// Whitespace is allowed in passwords but is neither punctuation nor a symbol.
const PUNCTUATION_OR_SYMBOL = /[\p{P}\p{S}]/u;

const codePoints = (value: string): number => [...value].length;
// Unpaired surrogates cannot be encoded to UTF-8 without silent replacement.
const isWellFormed = (value: string): boolean => !LONE_SURROGATE.test(value);
const isPresent = (value: string): boolean => value.length > 0;

/** Message for a missing field versus a value of the wrong type. */
function typeError(missing: string, invalid: string) {
  return {
    error: (issue: { input: unknown }) =>
      issue.input === undefined ? missing : invalid,
  };
}

const emailSchema = z
  .string(
    typeError('Enter your email address.', 'Enter a valid email address.'),
  )
  .trim()
  .toLowerCase()
  .refine(isPresent, { error: 'Enter your email address.', abort: true })
  // Bounding length first keeps the pattern from running on long input.
  .refine((value) => codePoints(value) <= EMAIL_MAX_LENGTH, {
    error: `Email must be at most ${EMAIL_MAX_LENGTH} characters.`,
    abort: true,
  })
  .regex(z.regexes.email, { error: 'Enter a valid email address.' });

const nameSchema = z
  .string(typeError('Enter your name.', 'Enter a valid name.'))
  .trim()
  .refine(isPresent, { error: 'Enter your name.', abort: true })
  .refine(isWellFormed, { error: 'Enter a valid name.', abort: true })
  .refine((value) => codePoints(value) >= NAME_MIN_LENGTH, {
    error: `Name must be at least ${NAME_MIN_LENGTH} characters.`,
  })
  .refine((value) => codePoints(value) <= NAME_MAX_LENGTH, {
    error: `Name must be at most ${NAME_MAX_LENGTH} characters.`,
  });

/** Passwords are never trimmed, normalized, or truncated. */
function passwordBase(missing: string) {
  return z
    .string(typeError(missing, 'Enter a valid password.'))
    .refine(isPresent, { error: missing, abort: true })
    .refine(isWellFormed, { error: 'Enter a valid password.', abort: true })
    .refine((value) => codePoints(value) <= PASSWORD_MAX_LENGTH, {
      error: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
      abort: true,
    });
}

const newPasswordSchema = passwordBase('Enter a password.')
  .refine((value) => codePoints(value) >= PASSWORD_MIN_LENGTH, {
    error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  })
  .refine((value) => LETTER.test(value), {
    error: 'Password must include a letter.',
  })
  .refine((value) => DECIMAL_DIGIT.test(value), {
    error: 'Password must include a number.',
  })
  .refine((value) => PUNCTUATION_OR_SYMBOL.test(value), {
    error: 'Password must include a special character.',
  });

// Signin checks only presence and bounds; composition rules are signup policy.
const currentPasswordSchema = passwordBase('Enter your password.');

export const signupRequestSchema = z.strictObject({
  name: nameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const signinRequestSchema = z.strictObject({
  email: emailSchema,
  password: currentPasswordSchema,
});

export const logoutRequestSchema = z.strictObject({});

/** What a client sends. */
export type SignupRequest = z.input<typeof signupRequestSchema>;
/** Validated, normalized values: trimmed name, trimmed lowercase email. */
export type ParsedSignupRequest = z.output<typeof signupRequestSchema>;
export type SigninRequest = z.input<typeof signinRequestSchema>;
export type ParsedSigninRequest = z.output<typeof signinRequestSchema>;
export type LogoutRequest = z.input<typeof logoutRequestSchema>;

export const publicUserSchema = z.strictObject({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;

/** Body of signup (201), signin (200), and `/auth/me` (200) responses. */
export const userResponseSchema = z.strictObject({ user: publicUserSchema });

export type UserResponse = z.infer<typeof userResponseSchema>;
