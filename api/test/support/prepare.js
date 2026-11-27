// Runs once before the tests (see "pretest" in package.json).
//
// The test files run side by side, each starting its own in-memory MongoDB. The first time,
// that means downloading the MongoDB program, and several files starting the same download at
// once trip over each other's lock. Starting one database here first gets the download done
// before any of them begin.
import { MongoMemoryServer } from 'mongodb-memory-server-core';

const mongod = await MongoMemoryServer.create();
await mongod.stop();
