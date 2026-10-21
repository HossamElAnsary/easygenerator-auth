import { isDeepStrictEqual } from 'node:util';
import type { mongo } from 'mongoose';

export interface RequiredIndex {
  readonly name: string;
  readonly key: Readonly<Record<string, 1>>;
  readonly unique?: true;
  readonly expireAfterSeconds?: number;
}

/** One collection's required indexes, declared by the module that owns it. */
export interface CollectionIndexes {
  readonly collection: string;
  readonly indexes: readonly RequiredIndex[];
}

/**
 * Creates any missing index, then verifies each required definition exactly.
 * Existing indexes are never dropped or modified: a conflicting definition
 * makes createIndexes or the verification throw, failing startup closed
 * (Architecture A03).
 */
export async function ensureIndexes(
  collection: mongo.Collection,
  required: readonly RequiredIndex[],
): Promise<void> {
  await collection.createIndexes(required.map((index) => ({ ...index })));
  const existing = await collection.indexes();
  for (const index of required) {
    const actual = existing.find(({ name }) => name === index.name);
    if (
      !actual ||
      !isDeepStrictEqual(actual.key, index.key) ||
      actual.unique !== index.unique ||
      actual.expireAfterSeconds !== index.expireAfterSeconds
    ) {
      throw new Error(
        `Index ${index.name} on ${collection.collectionName} does not match its required definition.`,
      );
    }
  }
}
