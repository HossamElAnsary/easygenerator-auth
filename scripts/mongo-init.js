/* global db, print, sleep */
// Executed only inside this project's Compose container, never against a URI
// supplied by the caller. Existing replica sets are checked, never reconfigured.
const setName = 'easy-generator-rs';
const memberHost = 'localhost:27018';
const admin = db.getSiblingDB('admin');
const startup = admin.runCommand({ getCmdLineOpts: 1 });
if (startup.parsed?.replication?.replSet !== setName) {
  throw new Error('Refusing to initialize an unexpected MongoDB process.');
}

let current;
try {
  current = admin.runCommand({ replSetGetConfig: 1 });
} catch (error) {
  // Preserve only the classification; command details must not enter CLI output.
  current = { ok: 0, code: error.code };
}
if (current.ok === 1) {
  const config = current.config;
  if (
    config._id !== setName ||
    config.members.length !== 1 ||
    config.members[0].host !== memberHost
  ) {
    throw new Error(
      'Existing replica-set configuration differs; no changes made.',
    );
  }
} else if (current.code === 94) {
  const result = admin.runCommand({
    replSetInitiate: {
      _id: setName,
      members: [{ _id: 0, host: memberHost }],
    },
  });
  if (result.ok !== 1) throw new Error('Replica-set initialization failed.');
} else {
  throw new Error('Cannot safely inspect replica-set configuration.');
}

const deadline = Date.now() + 30_000;
let ready = false;
while (Date.now() < deadline) {
  const hello = admin.runCommand({ hello: 1 });
  if (hello.setName === setName && hello.isWritablePrimary === true) {
    ready = true;
    break;
  }
  sleep(250);
}
if (!ready)
  throw new Error('Replica set did not become writable within 30 seconds.');
print('Local replica set is writable.');
