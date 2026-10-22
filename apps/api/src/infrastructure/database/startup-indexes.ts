/**
 * The startup index gate, and its DI token. DatabaseService awaits it after
 * connecting and before readiness, so the application never serves without
 * its indexes. The composition root supplies the implementation, because only
 * it knows every module's collections.
 */
export abstract class StartupIndexes {
  abstract verify(): Promise<void>;
}
