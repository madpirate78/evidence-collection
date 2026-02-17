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
    url: env("DIRECT_DATABASE_URL") || env("DATABASE_URL"),
  },
});
