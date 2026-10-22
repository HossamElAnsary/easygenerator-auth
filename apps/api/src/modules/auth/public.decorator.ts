import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE = 'auth:public';

/**
 * Exempts one handler from session authentication only. Origin, header, body,
 * throttling, validation, and logging rules still apply. Typed as a method
 * decorator, and only read from handlers, so a whole controller cannot be
 * made public by accident (Architecture A09).
 */
export const Public = (): MethodDecorator => SetMetadata(PUBLIC_ROUTE, true);
