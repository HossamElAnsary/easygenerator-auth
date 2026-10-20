# User Experience Contract

Return to [PLAN.md](../../PLAN.md). Visual preference confirmed by the user: **clean, minimal, professional**. Field and API rules are owned by [Architecture](architecture.md).

## Screens and navigation

| Route | Anonymous visitor | Authenticated visitor |
| --- | --- | --- |
| `/` | Redirect to `/signin` | Redirect to `/app` |
| `/signup` | Signup form | Redirect to `/app` |
| `/signin` | Signin form | Redirect to `/app` |
| `/app` | Redirect to `/signin` | Welcome page |
| Unknown browser route | Small not-found page with a home link | Same |

Use fixed destinations; no return-URL/query redirect feature. Redirects after auth checks use history replacement where appropriate so the browser back button does not expose stale protected UI. Route protection is user experience; the backend guard is the security boundary.

Primary journey:

1. Visitor opens signup, fills name/email/password, and sees the password rules.
2. Valid submission creates the account and navigates to signin with `Account created. Sign in to continue.` No session is created by signup.
3. Correct signin establishes the session, updates auth state from the server response, and navigates to `/app`.
4. The application displays exactly **Welcome to the application.** and a logout button.
5. Successful logout revokes the current session, clears local auth state, and returns to signin.

## Session state model

| State | Meaning | UI behavior |
| --- | --- | --- |
| `checking` | Session lookup has not resolved | Compact accessible loading state; no flash of signin or protected content |
| `authenticated` | Server confirmed a user | Allow application; redirect away from auth forms |
| `anonymous` | Server returned 401 or logout succeeded | Allow signup/signin; redirect from application |
| `unavailable` | Session lookup failed with network error, timeout, 5xx, or another non-401 failure | Explain that session verification failed and offer Retry; do not claim logout |

On app boot or refresh, request `GET /api/auth/me`. A 200 response sets authenticated; a 401 sets anonymous. Recheck on navigation to an auth-dependent route (`/`, `/signup`, `/signin`, `/app`), when a previously inactive tab regains focus, and on reconnection; suppress overlapping checks. Do not poll continuously. A previously authenticated user receiving 401 gets `Your session has expired. Please sign in again.` A first anonymous visit does not show an expiry message.

When verification becomes unavailable, withhold protected content until a successful retry confirms identity. Use `We couldn't check your session. Try again.` Rate-limit responses show a suitable wait/retry message instead. Preserve any in-memory user only as unverified state; it does not authorize rendering.

The full-page checking state applies to initial resolution. Track background revalidation separately: keep already mounted public forms and their entered values intact when focus returns, including from a password manager. Show a non-destructive checking/error notice with Retry on those forms rather than unmounting them; a confirmed authenticated result can then redirect normally. Protected content is withheld while its identity is being revalidated. A refresh/navigation may reset form state, but a background check alone must not.

Cancel or ignore stale async responses when navigation or auth mutations supersede them. In particular, an old session check must not restore authenticated state after logout or overwrite a newer successful signin. Logout failure leaves the user in the current state with a retryable message and does not announce successful signout. Another tab notices revocation at its next focus/navigation/API check; immediate cross-tab broadcast is not in scope.

## Form behavior

Signup has **name, email, password**. Signin has **email, password**. Do not add confirmation-password, remember-me, marketing consent, or unavailable recovery/social-login actions.

React Hook Form owns each form's local lifecycle; the shared Zod resolver owns validation. TanStack Query and the auth coordinator implement the session states above. Follow [Architecture A11](architecture.md#a11--frontend-packages-and-state-ownership) for exact ownership, retry, and cache rules; library defaults must preserve these user-visible behaviors.

- Show the four required password rules before submission. Apply the exact normalization, Unicode definitions, and limits from Architecture.
- Validate on blur and submit; update a displayed error while the user corrects it. Signin applies shared email normalization/format rules and required input bounds, but not signup password composition.
- Keep submit enabled before an attempt so invalid input can reveal useful feedback. While a request is pending, prevent another submission and show `Creating account…`, `Signing in…`, or `Signing out…`.
- Associate field errors with their inputs; after invalid submission focus the first invalid field. Server field errors use the same presentation.
- Show request-level errors near the form. Use the API's generic invalid-credential message and its duplicate-email message; never probe account existence from the browser.
- Preserve entries during recoverable failures, only in component memory. Do not write passwords to browser storage, URLs, logs, analytics, or durable state. Clear form data on successful navigation/unmount.
- Provide a keyboard-accessible show/hide password control with an accurate accessible label and state. Allow paste and password managers.
- Successful signup can pass the normalized email to signin using transient in-memory/navigation state; omit passwords and do not put email in the URL. Losing this convenience on refresh is acceptable.
- Use a bounded client timeout (initial target 15 seconds). Abort local waiting and offer manual recovery; an aborted request may still have completed on the server. Never automatically retry POST mutations.
- On 429, display a retry-later message consistent with `Retry-After`; clear pending state and allow retry after the wait. On network/5xx errors, show a recoverable service message.

## Visual direction

Use one restrained layout: an off-white/light-neutral page, a centered white form surface, dark readable text, one blue primary accent, subtle borders, and clear spacing. Prefer a system font stack and no external font/image dependencies. Use the same field, button, spacing, and status treatments across both forms.

The auth surface is approximately 420 px wide with fluid width and at least 16 px page gutters. Keep a single-column layout on mobile and desktop; allow vertical scrolling on short viewports. The welcome page uses the same restrained styling and a clearly discoverable logout action. No marketing panel, invented product features, or placeholder navigation is needed.

Exact spacing/color values are implementation details subject to contrast and usability checks. Do not create a separate design-system project or visual asset-generation task.

## Accessibility and responsive review

- Use native forms/inputs/buttons, visible labels, a logical heading hierarchy, and a sensible tab order.
- Email uses `type=email`; autocomplete is `name` for name, `username` for account email, `new-password` for signup, and `current-password` for signin. Forms use `noValidate` so shared-schema messages are authoritative. Do not add native length restrictions that disagree with Unicode-code-point counting.
- Use `aria-describedby` for rules/errors, `aria-invalid` for invalid fields, and restrained live announcements for submission results and errors. Do not announce every keystroke.
- Keep focus visible; make password controls and links keyboard-operable. Move focus to the page heading after navigation and to the first invalid field after failed validation.
- Ensure text and control contrast is readable and errors have text/icons in addition to color; aim for at least 4.5:1 normal-text contrast. Use comfortable touch targets of approximately 44 px.
- Verify keyboard-only use, 200% zoom, and widths of 320, 375, 768, and 1440 px without horizontal overflow or clipped actions.
- Check that pending/loading states are understandable to assistive technology and that the active submission state prevents repeated requests.

These are design acceptance checks, not a claim of a formal accessibility certification. Automate the important behavior and perform a short recorded manual review for layout, focus, and visual states.
