import "server-only";
import mongoose from "mongoose";
import { getEnv } from "./env";

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = (globalForMongoose._mongoose ??= {
  conn: null,
  promise: null,
});

export async function connectDb() {
  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose.connect(getEnv().MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null; // allow retry on the next request
    throw err;
  }
  return cache.conn;
}
