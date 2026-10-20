import { StandardSchemaValidationPipe } from '@nestjs/common';
import { RequestValidationError } from '../common/errors.js';

/** The structural subset of a Standard Schema issue that we read. */
interface SchemaIssue {
  readonly message: string;
  readonly path?:
    ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
}

/**
 * Nest's pipe recursively deletes `__proto__`, `prototype`, and `constructor`
 * keys before validating. That hides them from the strict schemas, which must
 * reject them as unexpected properties (Architecture A04), and the unbounded
 * recursion turns a deeply nested body into a stack overflow and a 500.
 * Skipping it removes no protection: with `transform: true`, handlers receive
 * only the schema's freshly built output, never the raw body.
 */
class StrictSchemaValidationPipe extends StandardSchemaValidationPipe {
  protected override stripProtoKeys(): void {
    // Intentionally empty; see the class comment.
  }
}

/** Applies the shared schemas attached with `@Body({ schema })`. */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StrictSchemaValidationPipe({
    transform: true,
    exceptionFactory: (issues) =>
      new RequestValidationError(fieldErrorsOf(issues)),
  });
}

/**
 * Groups schema messages by top-level field. Root-level issues (a non-object
 * body or an unexpected key) are dropped: they are reported generically, and
 * the schema's own wording for them quotes the offending key.
 */
export function fieldErrorsOf(
  issues: readonly SchemaIssue[],
): Record<string, string[]> | undefined {
  const fields = new Map<string, string[]>();
  for (const issue of issues) {
    const segment = issue.path?.[0];
    const field = typeof segment === 'object' ? segment.key : segment;
    if (typeof field !== 'string') continue;
    const messages = fields.get(field) ?? [];
    if (!messages.includes(issue.message)) messages.push(issue.message);
    fields.set(field, messages);
  }
  return fields.size > 0 ? Object.fromEntries(fields) : undefined;
}
