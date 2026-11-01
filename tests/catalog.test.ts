import { expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { validateEntry, sourceUrl, validatePackageBytes } from "../scripts/validate";
import schema from "../schema/marketplace.schema.json";

const fixture = {
  id: "test.plugin",
  publisher: "Test publisher",
  category: "productivity",
  keywords: ["test"],
  updatedAt: "2026-01-01",
  manifest: {
    id: "test.plugin",
    version: "1.0.0",
    apiVersion: 1,
    name: { en: "Test plugin", ru: "Тестовый плагин" },
    description: { en: "Validator fixture", ru: "Данные для проверки валидатора" },
    permissions: ["ui.render"],
    commands: [],
    views: [
      { id: "panel", title: { en: "Panel", ru: "Панель" }, slot: "app.page", renderer: "react" },
    ],
  },
  source: {
    type: "github",
    repository: "example/plugins",
    revision: "a".repeat(40),
    path: "packages/test.json",
  },
  sha256: "b".repeat(64),
  changelog: { en: "Test release", ru: "Тестовый выпуск" },
};

it("accepts an immutable GitHub source", () => {
  expect(() => validateEntry(fixture)).not.toThrow();
  expect(sourceUrl(fixture)).toContain(fixture.source.revision);
});

it("accepts only the initial numeric API version", () => {
  expect(() =>
    validateEntry({ ...fixture, manifest: { ...fixture.manifest, apiVersion: 1 } }),
  ).not.toThrow();

  for (const apiVersion of [0, 2, 3, "1", null]) {
    expect(() =>
      validateEntry({ ...fixture, manifest: { ...fixture.manifest, apiVersion } }),
    ).toThrow();
  }

  expect(schema.$defs.entry.properties.manifest.properties.apiVersion).toEqual({ const: 1 });
});

it("rejects invented permissions", () => {
  const value = structuredClone(fixture);

  value.manifest.permissions.push("invented.permission");
  expect(() => validateEntry(value)).toThrow();
});

it("rejects moving branches and path traversal", () => {
  for (const source of [
    { ...fixture.source, revision: "main" },
    { ...fixture.source, path: "../secret" },
  ]) {
    expect(() => validateEntry({ ...fixture, source })).toThrow();
  }
});

it("rejects mismatched identity", () => {
  expect(() => validateEntry({ ...fixture, id: "other" })).toThrow();
});

it("accepts optional overview only with both localized Markdown values", () => {
  expect(() =>
    validateEntry({
      ...fixture,
      overview: {
        en: "# Overview\n\nA **useful** plugin.",
        ru: "# Описание\n\nПолезный **плагин**.",
      },
    }),
  ).not.toThrow();

  expect(() => validateEntry(fixture)).not.toThrow();

  for (const overview of [
    "Legacy overview",
    null,
    { en: "English" },
    { ru: "Русский" },
    { en: "", ru: "Русский" },
    { en: "English", ru: "" },
    { en: "English", ru: "Русский", de: "Deutsch" },
  ]) {
    expect(() => validateEntry({ ...fixture, overview })).toThrow();
  }

  expect(schema.$defs.entry.properties.overview).toEqual({ $ref: "#/$defs/localizedMarkdown" });
  expect(schema.$defs.localizedMarkdown.required).toEqual(["ru", "en"]);
});

it("rejects raw HTML in either overview locale", () => {
  for (const locale of ["en", "ru"]) {
    for (const markdown of ["<script>bad</script>", "Text <img src=x>", "Text </p>"]) {
      expect(() =>
        validateEntry({
          ...fixture,
          overview: { en: "English", ru: "Русский", [locale]: markdown },
        }),
      ).toThrow("Raw HTML is not allowed");
    }
  }
});

it("bounds each overview locale separately at 20000 UTF-8 bytes", () => {
  expect(() =>
    validateEntry({ ...fixture, overview: { en: "x".repeat(20000), ru: "я".repeat(10000) } }),
  ).not.toThrow();

  expect(() =>
    validateEntry({ ...fixture, overview: { en: "🙂".repeat(5000), ru: "Русский" } }),
  ).not.toThrow();

  for (const locale of ["en", "ru"]) {
    expect(() =>
      validateEntry({
        ...fixture,
        overview: { en: "English", ru: "Русский", [locale]: "x".repeat(20001) },
      }),
    ).toThrow();

    expect(() =>
      validateEntry({
        ...fixture,
        overview: { en: "English", ru: "Русский", [locale]: "я".repeat(10001) },
      }),
    ).toThrow("Overview exceeds 20000 UTF-8 bytes");

    expect(schema.$defs.localizedMarkdown.properties[locale as "en" | "ru"].maxLength).toBe(20000);
  }
});

it("supports at most ten screenshots and a repository link", () => {
  const screenshot = {
    url: "https://raw.githubusercontent.com/sobes-tech/plugin-marketplace/main/assets/example.png",
    caption: { en: "Example", ru: "Пример" },
  };

  expect(() =>
    validateEntry({
      ...fixture,
      repository: "https://github.com/sobes-tech/plugin-sdk",
      screenshots: Array(10).fill(screenshot),
    }),
  ).not.toThrow();

  expect(() => validateEntry({ ...fixture, screenshots: Array(11).fill(screenshot) })).toThrow();
  expect(() =>
    validateEntry({ ...fixture, screenshots: [{ url: "javascript:alert(1)" }] }),
  ).toThrow();

  expect(() =>
    validateEntry({ ...fixture, repository: "https://user:password@github.com/test/repo" }),
  ).toThrow();
});

function packageOfSize(size: number, character = "x"): Uint8Array {
  const base = JSON.stringify({ manifest: fixture.manifest, source: "" });
  const available = size - Buffer.byteLength(base);
  const width = Buffer.byteLength(character);
  const source = character.repeat(Math.floor(available / width)) + "x".repeat(available % width);

  return Buffer.from(JSON.stringify({ manifest: fixture.manifest, source }));
}

function entryFor(bytes: Uint8Array) {
  return { ...fixture, sha256: createHash("sha256").update(bytes).digest("hex") };
}

it("accepts packages larger than the previous 2 MiB limit", () => {
  const bytes = packageOfSize(2 * 1024 * 1024 + 1);

  expect(() => validatePackageBytes(bytes, entryFor(bytes))).not.toThrow();
});

it("accepts a package at the exact 32 MiB byte boundary", () => {
  const bytes = packageOfSize(32 * 1024 * 1024);

  expect(bytes.byteLength).toBe(32 * 1024 * 1024);
  expect(() => validatePackageBytes(bytes, entryFor(bytes))).not.toThrow();
});

it("rejects one UTF-8 byte over 32 MiB even when the text has fewer code units", () => {
  const bytes = packageOfSize(32 * 1024 * 1024 + 1, "🙂");

  expect(bytes.byteLength).toBe(32 * 1024 * 1024 + 1);
  expect(new TextDecoder().decode(bytes).length).toBeLessThan(32 * 1024 * 1024);
  expect(() => validatePackageBytes(bytes, entryFor(bytes))).toThrow("Package exceeds 32 MiB");
});

it("still verifies the exact package checksum and manifest", () => {
  const bytes = Buffer.from(
    JSON.stringify({ manifest: fixture.manifest, source: "// café 🙂\n" }) + "\n",
  );

  expect(() => validatePackageBytes(bytes, entryFor(bytes))).not.toThrow();
  expect(() =>
    validatePackageBytes(Buffer.concat([bytes, Buffer.from(" ")]), entryFor(bytes)),
  ).toThrow("Checksum mismatch");

  const differentManifest = Buffer.from(
    JSON.stringify({ manifest: { ...fixture.manifest, version: "2.0.0" }, source: "void 0" }),
  );

  expect(() => validatePackageBytes(differentManifest, entryFor(differentManifest))).toThrow(
    "Manifest mismatch",
  );
});

it("rejects malformed executable payloads without executing submitted code", () => {
  const pack = (fields: Record<string, unknown>) =>
    Buffer.from(JSON.stringify({ manifest: fixture.manifest, source: "void 0", ...fields }));

  for (const fields of [
    { source: 42 },
    { source: "function {" },
    { ui: { javascript: "const =" } },
    { binary: "executable" },
  ]) {
    const bytes = pack(fields);

    expect(() => validatePackageBytes(bytes, entryFor(bytes))).toThrow();
  }

  const bytes = pack({
    source:
      "globalThis.__marketplaceValidationExecuted = true; throw new Error('must not execute');",
  });

  expect(() => validatePackageBytes(bytes, entryFor(bytes))).not.toThrow();
  expect(Reflect.has(globalThis, "__marketplaceValidationExecuted")).toBe(false);
});
