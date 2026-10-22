import type { PublicUser } from '@easy-generator/contracts';

/** A user to insert. `email` is already normalized by the shared schema. */
export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
}

/** Internal signin record. Never serialize it: it carries the password hash. */
export interface UserCredentials {
  user: PublicUser;
  passwordHash: string;
}

/**
 * User persistence, and its DI token. Implementations return plain domain
 * types with string IDs, never database documents (Engineering E03).
 */
export abstract class UsersRepository {
  /**
   * Inserts one user. Throws EmailInUseError only for a conflict on the
   * normalized-email index, which decides concurrent duplicates.
   */
  abstract create(user: NewUser): Promise<PublicUser>;

  abstract findCredentialsByEmail(
    email: string,
  ): Promise<UserCredentials | null>;

  abstract findPublicById(id: string): Promise<PublicUser | null>;
}
