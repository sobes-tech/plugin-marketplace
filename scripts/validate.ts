import { createHash } from "node:crypto";
import permissions from "../schema/permissions.json";

export type RecordValue = Record<string, unknown>;

function object(value: unknown): asserts value is RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected object");
  }
}

function text(value: unknown, max = 1000): asserts value is string {
  if (typeof value !== "string" || !value.length || value.length > max) {
    throw new Error("Invalid string");
  }
}

function keys(value: RecordValue, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new Error("Unknown entry field");
  }
}

function localized(value: unknown, max = 1000): asserts value is { ru: string; en: string } {
  object(value);
  keys(value, ["ru", "en"]);
  text(value.ru, max);
  text(value.en, max);
}

function repository(value: unknown): asserts value is string {
  text(value, 201);

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error("Invalid GitHub repository");
  }
}

export function validateEntry(value: unknown): asserts value is RecordValue {
  object(value);
  keys(value, [
    "id",
    "publisher",
    "category",
    "keywords",
    "updatedAt",
    "manifest",
    "source",
    "sha256",
    "changelog",
    "overview",
    "repository",
    "screenshots",
  ]);

  text(value.id, 100);

  if (!/^[a-z0-9][a-z0-9.-]*$/.test(value.id)) {
    throw new Error("Invalid ID");
  }

  text(value.publisher, 200);
  text(value.category, 100);
  text(value.updatedAt, 30);
  localized(value.changelog);

  if (
    !Array.isArray(value.keywords) ||
    value.keywords.length > 20 ||
    value.keywords.some((k) => typeof k !== "string")
  ) {
    throw new Error("Invalid keywords");
  }

  text(value.sha256, 64);

  if (!/^[a-f0-9]{64}$/.test(value.sha256)) {
    throw new Error("Invalid SHA-256");
  }

  object(value.manifest);
  const manifest = value.manifest;

  if (manifest.id !== value.id || manifest.apiVersion !== 1) {
    throw new Error("Manifest identity mismatch");
  }

  localized(manifest.name);
  localized(manifest.description);
  text(manifest.version, 100);

  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/.test(manifest.version)) {
    throw new Error("Invalid version");
  }

  if (
    !Array.isArray(manifest.permissions) ||
    manifest.permissions.some((id) => !permissions.some((p) => p.id === id)) ||
    new Set(manifest.permissions).size !== manifest.permissions.length
  ) {
    throw new Error("Unknown or duplicate permission");
  }

  if (!Array.isArray(manifest.commands)) {
    throw new Error("Commands must be an array");
  }

  if (Array.isArray(manifest.views)) {
    for (const view of manifest.views) {
      object(view);
      text(view.slot);

      if (
        !manifest.permissions.includes(
          view.slot.startsWith("overlay.") ? "overlay.render" : "ui.render",
        )
      ) {
        throw new Error("UI permission required");
      }
    }
  }

  object(value.source);
  const source = value.source;

  repository(source.repository);

  if (source.type === "github") {
    keys(source, ["type", "repository", "revision", "path"]);
    text(source.revision, 40);
    text(source.path, 300);

    if (
      !/^[a-f0-9]{40}$/.test(source.revision) ||
      source.path
        .split("/")
        .some((part) => !part || part === "." || part === ".." || !/^[A-Za-z0-9_.-]+$/.test(part))
    ) {
      throw new Error("Source must use a pinned commit and safe path");
    }
  } else if (source.type === "release") {
    keys(source, ["type", "repository", "tag", "asset"]);
    text(source.tag, 128);
    text(source.asset, 200);

    if (!/^[A-Za-z0-9_.-]+$/.test(source.asset)) {
      throw new Error("Unsafe release asset");
    }
  } else {
    throw new Error("Only GitHub commits and release assets are accepted");
  }

  if (value.repository !== undefined) {
    catalogUrl(value.repository, false);
  }

  if (value.screenshots !== undefined) {
    if (!Array.isArray(value.screenshots) || value.screenshots.length > 10) {
      throw new Error("At most 10 screenshots are allowed");
    }

    for (const image of value.screenshots) {
      object(image);
      keys(image, ["url", "caption"]);
      catalogUrl(image.url, true);

      if (image.caption !== undefined) {
        localized(image.caption, 500);
      }
    }
  }

  if (value.overview !== undefined) {
    localized(value.overview, 20000);

    for (const markdown of [value.overview.en, value.overview.ru]) {
      if (Buffer.byteLength(markdown, "utf8") > 20000) {
        throw new Error("Overview exceeds 20000 UTF-8 bytes");
      }

      if (/<\/?[A-Za-z][^>]*>/.test(markdown)) {
        throw new Error("Raw HTML is not allowed");
      }
    }
  }
}

function catalogUrl(value: unknown, image: boolean) {
  text(value, 2048);
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !(
      image
        ? ["github.com", "raw.githubusercontent.com", "user-images.githubusercontent.com"]
        : ["github.com"]
    ).includes(url.hostname)
  ) {
    throw new Error("Invalid catalog URL");
  }
}

export function sourceUrl(entry: RecordValue): string {
  const source = entry.source as RecordValue;

  return source.type === "github"
    ? `https://raw.githubusercontent.com/${source.repository}/${source.revision}/${source.path}`
    : `https://github.com/${source.repository}/releases/download/${encodeURIComponent(String(source.tag))}/${encodeURIComponent(String(source.asset))}`;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

/** Validate the exact downloaded bytes, including UTF-8 and JSON whitespace. */
export function validatePackageBytes(bytes: Uint8Array, entry: RecordValue): void {
  if (bytes.byteLength > 32 * 1024 * 1024) {
    throw new Error(`Package exceeds 32 MiB: ${entry.id}`);
  }

  if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) {
    throw new Error(`Checksum mismatch: ${entry.id}`);
  }

  const archive = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

  if (canonical(JSON.parse(archive).manifest) !== canonical(entry.manifest)) {
    throw new Error(`Manifest mismatch: ${entry.id}`);
  }
}
