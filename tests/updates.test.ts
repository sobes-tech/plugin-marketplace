import { expect, it } from "bun:test";
import entry from "../entries/sobes.system-design-calculator.json";
import { validateUpdates } from "../scripts/updates";

const catalog = (value = entry) => ({ plugins: [value] });

it("allows metadata edits and removal without changing released bytes", () => {
  expect(() =>
    validateUpdates(catalog(), catalog({ ...entry, publisher: "Updated display name" })),
  ).not.toThrow();

  expect(() => validateUpdates(catalog(), { plugins: [] })).not.toThrow();
});

it("rejects replacement of a published version and build-metadata aliases", () => {
  for (const version of [entry.manifest.version, `${entry.manifest.version}+rebuilt`]) {
    expect(() =>
      validateUpdates(
        catalog(),
        catalog({ ...entry, sha256: "0".repeat(64), manifest: { ...entry.manifest, version } }),
      ),
    ).toThrow("higher version");
  }
});

it("accepts a newer package but rejects downgrade and source takeover", () => {
  const next = {
    ...entry,
    sha256: "0".repeat(64),
    manifest: { ...entry.manifest, version: "2.0.0" },
  };

  expect(() => validateUpdates(catalog(), catalog(next))).not.toThrow();
  expect(() => validateUpdates(catalog(next), catalog())).toThrow("downgrade");
  expect(() =>
    validateUpdates(
      catalog(),
      catalog({ ...next, source: { ...next.source, repository: "attacker/replacement" } }),
    ),
  ).toThrow("Source repository");
});

it("validates new plugins and rejects invalid semantic versions", () => {
  expect(() => validateUpdates({ plugins: [] }, catalog())).not.toThrow();
  expect(() =>
    validateUpdates(
      { plugins: [] },
      catalog({ ...entry, manifest: { ...entry.manifest, version: "01.0.0" } }),
    ),
  ).toThrow("semantic version");
});
