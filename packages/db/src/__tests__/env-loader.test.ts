import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRootEnvFile } from "../index";

describe("db env loader", () => {
  it("loads DATABASE_URL from an ancestor .env file", () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const root = mkdtempSync(join(tmpdir(), "career-os-env-"));
    const nested = join(root, "apps", "web");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(root, ".env"), "DATABASE_URL=\"postgresql://user:pass@localhost:5432/career_os?schema=public\"\n");

    try {
      delete process.env.DATABASE_URL;
      loadRootEnvFile(nested);
      expect(process.env.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/career_os?schema=public");
    } finally {
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps an existing DATABASE_URL untouched", () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const root = mkdtempSync(join(tmpdir(), "career-os-env-"));
    writeFileSync(join(root, ".env"), "DATABASE_URL=\"postgresql://from-file\"\n");

    try {
      process.env.DATABASE_URL = "postgresql://from-process";
      loadRootEnvFile(root);
      expect(process.env.DATABASE_URL).toBe("postgresql://from-process");
    } finally {
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
      rmSync(root, { recursive: true, force: true });
    }
  });
});
