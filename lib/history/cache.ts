import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_ROOT = path.join(process.cwd(), "data", "cache");

async function ensureNamespace(namespace: string) {
  const dir = path.join(CACHE_ROOT, namespace);
  await mkdir(dir, { recursive: true });
  return dir;
}

function filePath(namespace: string, key: string) {
  return path.join(CACHE_ROOT, namespace, `${key}.json`);
}

export async function readCache<T>(namespace: string, key: string, maxAgeMs: number) {
  const target = filePath(namespace, key);

  try {
    const raw = await readFile(target, "utf8");
    const parsed = JSON.parse(raw) as { updatedAt: string; data: T };
    const age = Date.now() - new Date(parsed.updatedAt).getTime();

    if (Number.isNaN(age) || age > maxAgeMs) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export async function writeCache<T>(namespace: string, key: string, data: T) {
  const dir = await ensureNamespace(namespace);
  const target = path.join(dir, `${key}.json`);
  const payload = {
    updatedAt: new Date().toISOString(),
    data,
  };

  await writeFile(target, JSON.stringify(payload, null, 2), "utf8");
}
