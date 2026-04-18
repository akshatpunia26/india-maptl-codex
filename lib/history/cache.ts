import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_ROOTS = ["/tmp/maptl-cache"];

async function ensureNamespace(namespace: string) {
  for (const root of CACHE_ROOTS) {
    const dir = path.join(root, namespace);
    try {
      await mkdir(dir, { recursive: true });
      return dir;
    } catch {
      continue;
    }
  }

  throw new Error("No writable cache directory available.");
}

function filePath(namespace: string, key: string) {
  return CACHE_ROOTS.map((root) => path.join(root, namespace, `${key}.json`));
}

export async function readCache<T>(namespace: string, key: string, maxAgeMs: number) {
  for (const target of filePath(namespace, key)) {
    try {
      const raw = await readFile(target, "utf8");
      const parsed = JSON.parse(raw) as { updatedAt: string; data: T };
      const age = Date.now() - new Date(parsed.updatedAt).getTime();

      if (Number.isNaN(age) || age > maxAgeMs) {
        continue;
      }

      return parsed.data;
    } catch {
      continue;
    }
  }

  return null;
}

export async function writeCache<T>(namespace: string, key: string, data: T) {
  const dir = await ensureNamespace(namespace);
  const target = path.join(dir, `${key}.json`);
  const payload = {
    updatedAt: new Date().toISOString(),
    data,
  };

  try {
    await writeFile(target, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    // Ignore write failures on read-only deployments.
  }
}
