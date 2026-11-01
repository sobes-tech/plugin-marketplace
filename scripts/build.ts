import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { sourceUrl, validateEntry, validatePackageBytes, type RecordValue } from "./validate";

const root = resolve(import.meta.dir, "..");
const base = await Bun.file(resolve(root, "marketplace.base.json")).json();
const entries: RecordValue[] = [];

for (const filename of (await readdir(resolve(root, "entries")))
  .filter((f) => f.endsWith(".json"))
  .sort()) {
  const entry: unknown = await Bun.file(resolve(root, "entries", filename)).json();

  validateEntry(entry);

  if (filename !== `${entry.id}.json` || entries.some((e) => e.id === entry.id)) {
    throw new Error(`Invalid entry identity: ${filename}`);
  }

  if (!base.categories.some((c: { id: string }) => c.id === entry.category)) {
    throw new Error(`Unknown category: ${filename}`);
  }

  if (process.argv.includes("--remote")) {
    const response = await fetch(sourceUrl(entry), { signal: AbortSignal.timeout(15000) });

    if (!response.ok) {
      throw new Error(`Source unavailable: ${entry.id}`);
    }

    const allowed = [
      "raw.githubusercontent.com",
      "github.com",
      "release-assets.githubusercontent.com",
      "objects.githubusercontent.com",
    ];

    if (!allowed.includes(new URL(response.url).hostname)) {
      throw new Error("Unexpected release host");
    }

    validatePackageBytes(new Uint8Array(await response.arrayBuffer()), entry);
  }

  entries.push(entry);
}

const output = JSON.stringify({ ...base, plugins: entries }, null, 2) + "\n";
const target = Bun.file(resolve(root, "marketplace.json"));

if (process.argv.includes("--check")) {
  if ((await target.text()) !== output) {
    throw new Error("Run bun run build");
  }
} else {
  await Bun.write(target, output);
}
