import type { ZodType } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  logoutRequestSchema,
  signinRequestSchema,
  signupRequestSchema,
  userResponseSchema,
} from './index.js';

// Lengths below are hand-counted Unicode code points. Astral characters such as
// '𝒜' and '😀' are two UTF-16 code units each, so code-unit counting fails them.
const EMAIL_254 = `${'a'.repeat(64)}@${'b'.repeat(185)}.com`;
const EMAIL_255 = `${'a'.repeat(64)}@${'b'.repeat(186)}.com`;
const PASSWORD_128 = `a1${'😀'.repeat(126)}`;
const PASSWORD_129 = `a1${'😀'.repeat(127)}`;
const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'Analytical1!',
};

/** Groups issue messages by top-level field; non-field issues use '(root)'. */
function issuesOf(schema: ZodType, input: unknown): Record<string, string[]> {
  const result = schema.safeParse(input);
  if (result.success) return {};
  const grouped: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field =
      issue.path[0] === undefined ? '(root)' : String(issue.path[0]);
    (grouped[field] ??= []).push(issue.message);
  }
  return grouped;
}

describe('signup request', () => {
  it('normalizes email and name but returns the password unchanged', () => {
    expect(
      signupRequestSchema.parse({
        name: '  Ada  Lovelace ',
        email: '  Ada.Lovelace+Notes@Example.COM\t',
        password: '  Analytical Engine 1!  ',
      }),
    ).toEqual({
      name: 'Ada  Lovelace',
      email: 'ada.lovelace+notes@example.com',
      password: '  Analytical Engine 1!  ',
    });
  });

  it('does not Unicode-normalize passwords', () => {
    // 'e' + U+0301 COMBINING ACUTE ACCENT; NFC would collapse it to 'é'.
    const decomposed = 'éclair-12';
    expect(
      signupRequestSchema.parse({ ...valid, password: decomposed }).password,
    ).toBe('éclair-12');
  });

  it.each([
    ['USER@EXAMPLE.COM', 'user@example.com'],
    [' user@example.com ', 'user@example.com'],
    [' user@example.com　', 'user@example.com'],
  ])('normalizes email %j to %j', (email, expected) => {
    expect(signupRequestSchema.parse({ ...valid, email }).email).toBe(expected);
  });

  it('accepts a 254-character email and rejects 255 characters', () => {
    expect(
      issuesOf(signupRequestSchema, { ...valid, email: EMAIL_254 }),
    ).toEqual({});
    expect(
      issuesOf(signupRequestSchema, { ...valid, email: EMAIL_255 }),
    ).toEqual({ email: ['Email must be at most 254 characters.'] });
  });

  it('measures email length after trimming outer whitespace', () => {
    expect(
      signupRequestSchema.parse({ ...valid, email: `   ${EMAIL_254}   ` })
        .email,
    ).toBe(EMAIL_254);
  });

  it.each([
    'not-an-email',
    'user@',
    '@example.com',
    'user@@example.com',
    'user name@example.com',
    'user@example',
  ])('rejects malformed email %j', (email) => {
    expect(issuesOf(signupRequestSchema, { ...valid, email })).toEqual({
      email: ['Enter a valid email address.'],
    });
  });

  it.each([42, true, null, ['user@example.com'], { $gt: '' }])(
    'rejects a non-string email %j without coercion',
    (email) => {
      expect(issuesOf(signupRequestSchema, { ...valid, email })).toEqual({
        email: ['Enter a valid email address.'],
      });
    },
  );

  it.each(['', '   '])('asks for an email when it is blank (%j)', (email) => {
    expect(issuesOf(signupRequestSchema, { ...valid, email })).toEqual({
      email: ['Enter your email address.'],
    });
  });

  it('counts name length after trimming', () => {
    expect(issuesOf(signupRequestSchema, { ...valid, name: '  ab  ' })).toEqual(
      { name: ['Name must be at least 3 characters.'] },
    );
    expect(signupRequestSchema.parse({ ...valid, name: ' abc ' }).name).toBe(
      'abc',
    );
  });

  it('counts name length in code points, not UTF-16 units', () => {
    expect(issuesOf(signupRequestSchema, { ...valid, name: '𝒜𝒜' })).toEqual({
      name: ['Name must be at least 3 characters.'],
    });
    expect(
      issuesOf(signupRequestSchema, { ...valid, name: '𝒜'.repeat(100) }),
    ).toEqual({});
    expect(
      issuesOf(signupRequestSchema, { ...valid, name: '𝒜'.repeat(101) }),
    ).toEqual({ name: ['Name must be at most 100 characters.'] });
  });

  it.each(['José María', 'محمد علي', '李小龙', 'Zoë O’Brien'])(
    'accepts the international name %j unchanged',
    (name) => {
      expect(signupRequestSchema.parse({ ...valid, name }).name).toBe(name);
    },
  );

  it('asks for a name when it is blank', () => {
    expect(issuesOf(signupRequestSchema, { ...valid, name: '    ' })).toEqual({
      name: ['Enter your name.'],
    });
  });

  it('enforces password length in code points', () => {
    // 7 code points but 11 UTF-16 units.
    expect(
      issuesOf(signupRequestSchema, { ...valid, password: 'a1!😀😀😀😀' }),
    ).toEqual({ password: ['Password must be at least 8 characters.'] });
    expect(
      issuesOf(signupRequestSchema, { ...valid, password: 'Abcdef1!' }),
    ).toEqual({});
    expect(
      issuesOf(signupRequestSchema, { ...valid, password: PASSWORD_128 }),
    ).toEqual({});
    expect(
      issuesOf(signupRequestSchema, { ...valid, password: PASSWORD_129 }),
    ).toEqual({ password: ['Password must be at most 128 characters.'] });
  });

  it.each([
    ['12345678!', ['Password must include a letter.']],
    ['abcdefgh!', ['Password must include a number.']],
    ['abcdefg1', ['Password must include a special character.']],
    ['abcdefg 1', ['Password must include a special character.']],
    [
      'abc',
      [
        'Password must be at least 8 characters.',
        'Password must include a number.',
        'Password must include a special character.',
      ],
    ],
  ])('reports each unmet password rule for %j', (password, messages) => {
    expect(issuesOf(signupRequestSchema, { ...valid, password })).toEqual({
      password: messages,
    });
  });

  it.each(['пароль١٢!', 'clave12€'])(
    'accepts international letters, digits, and symbols in %j',
    (password) => {
      expect(signupRequestSchema.parse({ ...valid, password }).password).toBe(
        password,
      );
    },
  );

  it.each([
    ['name', 'Ada\uD800 Lovelace', 'Enter a valid name.'],
    ['password', 'Abcdef1!\uD83D', 'Enter a valid password.'],
  ])('rejects an unpaired surrogate in %s', (field, value, message) => {
    expect(issuesOf(signupRequestSchema, { ...valid, [field]: value })).toEqual(
      { [field]: [message] },
    );
  });

  it('reports every missing field', () => {
    expect(issuesOf(signupRequestSchema, {})).toEqual({
      name: ['Enter your name.'],
      email: ['Enter your email address.'],
      password: ['Enter a password.'],
    });
  });

  it('rejects unexpected properties without reporting them as fields', () => {
    expect(
      Object.keys(issuesOf(signupRequestSchema, { ...valid, role: 'admin' })),
    ).toEqual(['(root)']);
  });

  it.each([null, [], 'text', 42])('rejects the non-object body %j', (body) => {
    expect(Object.keys(issuesOf(signupRequestSchema, body))).toEqual([
      '(root)',
    ]);
  });
});

describe('signin request', () => {
  it.each([' Ada@Example.COM ', 'ADA@EXAMPLE.COM'])(
    'normalizes email %j exactly as signup does',
    (email) => {
      const signin = signinRequestSchema.parse({ email, password: 'x' });
      const signup = signupRequestSchema.parse({ ...valid, email });
      expect(signin.email).toBe('ada@example.com');
      expect(signup.email).toBe('ada@example.com');
    },
  );

  it.each(['abc', '        ', PASSWORD_128])(
    'accepts the nonempty password %j without signup composition rules',
    (password) => {
      expect(
        signinRequestSchema.parse({ email: valid.email, password }).password,
      ).toBe(password);
    },
  );

  it.each([
    ['', 'Enter your password.'],
    [PASSWORD_129, 'Password must be at most 128 characters.'],
    ['abc\uDFFF', 'Enter a valid password.'],
  ])('rejects the password %#', (password, message) => {
    expect(
      issuesOf(signinRequestSchema, { email: valid.email, password }),
    ).toEqual({ password: [message] });
  });

  it('applies the shared email format and length rules', () => {
    expect(
      issuesOf(signinRequestSchema, { email: 'not-an-email', password: 'x' }),
    ).toEqual({ email: ['Enter a valid email address.'] });
    expect(
      issuesOf(signinRequestSchema, { email: EMAIL_255, password: 'x' }),
    ).toEqual({ email: ['Email must be at most 254 characters.'] });
  });

  it('rejects unexpected properties', () => {
    expect(
      Object.keys(
        issuesOf(signinRequestSchema, {
          email: valid.email,
          password: 'x',
          remember: true,
        }),
      ),
    ).toEqual(['(root)']);
  });
});

describe('logout request', () => {
  it('accepts only an empty object', () => {
    expect(logoutRequestSchema.safeParse({}).success).toBe(true);
    for (const body of [{ token: 'x' }, null, []]) {
      expect(logoutRequestSchema.safeParse(body).success).toBe(false);
    }
  });
});

describe('user response', () => {
  const user = { id: '1', email: 'ada@example.com', name: 'Ada Lovelace' };

  it('accepts exactly the public user fields', () => {
    expect(userResponseSchema.parse({ user })).toEqual({ user });
    expect(
      userResponseSchema.safeParse({ user: { ...user, passwordHash: 'x' } })
        .success,
    ).toBe(false);
  });
});
