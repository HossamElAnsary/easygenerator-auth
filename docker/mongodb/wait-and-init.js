/* global connect, load, sleep */
// Run once by the Compose stack's mongodb-init service: wait until mongod
// accepts connections, then apply the same idempotent initializer that
// `npm run db:ready` uses. The set is not initiated yet, so connect directly.
const deadline = Date.now() + 60_000;
let database;
while (!database) {
  try {
    database = connect(
      'mongodb://localhost:27018/admin?directConnection=true&serverSelectionTimeoutMS=2000',
    );
  } catch {
    if (Date.now() > deadline)
      throw new Error('MongoDB did not accept connections within 60 seconds.');
    sleep(500);
  }
}
// mongo-init.js reads the shell's global database handle.
globalThis.db = database;
load('/opt/easy-generator/mongo-init.js');
