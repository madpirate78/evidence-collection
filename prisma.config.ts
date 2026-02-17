// Load dotenv only in development (it's a devDependency)
try {
  require("dotenv/config");
} catch {}

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // process.env used for DIRECT_DATABASE_URL since Prisma's env() throws
    // when the variable is missing, preventing the fallback from executing.
    // DIRECT_DATABASE_URL is optional (only needed for migrations bypassing pgbouncer).
    url: process.env.DIRECT_DATABASE_URL || env("DATABASE_URL"),
  },
});
