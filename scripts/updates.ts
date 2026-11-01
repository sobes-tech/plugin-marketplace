import { compare, valid } from "semver";
import { validateEntry, type RecordValue } from "./validate";

function entries(catalog: unknown): RecordValue[] {
  if (
    !catalog ||
    typeof catalog !== "object" ||
    !("plugins" in catalog) ||
    !Array.isArray(catalog.plugins)
  ) {
    throw new Error("Expected catalog plugins");
  }

  return catalog.plugins.map((entry: unknown) => {
    validateEntry(entry);

    if (!valid(String((entry.manifest as RecordValue).version))) {
      throw new Error(`Invalid semantic version: ${entry.id}`);
    }

    return entry;
  });
}

/** A published version is immutable; an existing ID cannot change its source owner. */
export function validateUpdates(previous: unknown, next: unknown): void {
  const before = new Map(entries(previous).map((entry) => [entry.id, entry]));

  for (const entry of entries(next)) {
    const old = before.get(entry.id);

    if (!old) {
      continue;
    }

    const source = entry.source as RecordValue;
    const oldSource = old.source as RecordValue;

    if (String(source.repository).toLowerCase() !== String(oldSource.repository).toLowerCase()) {
      throw new Error(`Source repository cannot change for an existing plugin ID: ${entry.id}`);
    }

    const version = String((entry.manifest as RecordValue).version);
    const oldVersion = String((old.manifest as RecordValue).version);
    const order = compare(version, oldVersion);

    if (order < 0) {
      throw new Error(`Published plugin cannot downgrade: ${entry.id}`);
    }

    if (entry.sha256 !== old.sha256 && order <= 0) {
      throw new Error(`Changed package bytes require a higher version: ${entry.id}`);
    }
  }
}
