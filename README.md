# Sobes Plugin Marketplace

A reviewed catalog for Sobes desktop plugins. This repository stores metadata; executable packages stay in their authors' GitHub repositories or release assets. The desktop reads the generated [marketplace.json](marketplace.json).

Submissions and updates follow [PUBLISHING_POLICY.md](PUBLISHING_POLICY.md), including source, publisher, license, dependency, and data-access review. Report suspected malicious behavior or vulnerabilities through [SECURITY.md](SECURITY.md). Automated validation and checksums do not certify a package as malware-free; custom catalogs and local files do not receive this catalog's maintainer review.

The initial release uses **plugin API 1**. Package versions follow semantic versioning independently of the API version. The catalog contains installable tools; SDK demonstrations remain in the SDK repository. Check the installed host's capabilities for available methods and features.

Start with the SDK [getting started guide](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/getting-started.md), [API reference](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/api.md), [UI slots](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/ui-slots.md), and [runtime guide](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/runtime-and-build.md). Resource grants, CRUD and live event streams are described in the [platform API](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/platform/README.md). For model integrations, see [plugin-configured HTTP requests](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/model-requests.md). The full documentation is available in [English](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/README.md) and [Russian](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/ru/README.md).

## Repository layout

| Path | Purpose |
| --- | --- |
| `entries/<plugin-id>.json` | One reviewed plugin entry. Edit this file to add or update a plugin. |
| `marketplace.base.json` | Catalog identity, localized name, and category definitions. |
| `marketplace.json` | Generated index consumed by the desktop. Do not edit it by hand. |
| `schema/marketplace.schema.json` | JSON Schema for the catalog document. |
| `schema/permissions.json` | Supported permission snapshot from the SDK. The desktop enforces its own registry. |
| `scripts/validate.ts` | Entry validation and source URL construction. |
| `scripts/build.ts` | Deterministic index generation and optional remote package checks. |
| `assets/` | Screenshots used by catalog entries. |

The JSON Schema, entry validator, and desktop package validator cover different layers. Run the repository checks and test the package in the desktop; JSON Schema validation alone does not establish that a plugin can install or run.

## Prepare a package and entry

1. Build a self-contained UTF-8 JSON package with the SDK's `buildPlugin` helper. It contains `manifest`, worker `source`, and an optional React `ui` bundle. The complete file must fit within 32 MiB, measured as UTF-8 bytes rather than JavaScript string length. Use `apiVersion: 1`, a stable plugin ID, and a semantic package version. For a new plugin, start at `1.0.0`.
2. Install the generated file locally through **Plugins → Installed → Install from file**. Check its requested permissions, commands, pages, settings, and behavior with the intended desktop version. The marketplace checks do not execute plugin code.
3. Make those exact package bytes available at a GitHub commit or named release asset. Do not rebuild, pretty-print, or change line endings after calculating the checksum.
4. Add `entries/<manifest.id>.json`. Copy the complete manifest from the built package, calculate its SHA-256, and fill in the metadata below. Choose a category already defined in `marketplace.base.json`.
5. Run the local checks, then the remote check after the referenced commit or release asset is accessible. Commit the entry and regenerated `marketplace.json` together and open a pull request.

This command extracts the two values that must come from the final package. Run it from a directory where the package path is valid:

```sh
bun - ./dist/plugin.json <<'TS'
import { createHash } from "node:crypto";

const bytes = await Bun.file(Bun.argv[2]).bytes();
const { manifest } = JSON.parse(new TextDecoder().decode(bytes));
console.log(JSON.stringify({
  manifest,
  sha256: createHash("sha256").update(bytes).digest("hex"),
}, null, 2));
TS
```

### Checksums and manifest equality

`sha256` covers the **entire package file**, byte for byte, including its worker source, React JavaScript/CSS, JSON whitespace, and final newline. It is not a hash of the manifest or a canonicalized JSON object. Any file change requires a new checksum.

Separately, the entry's `manifest` must describe the same manifest as the package. Remote validation compares JSON values after recursively sorting object keys; object key order and formatting do not matter, while array order and values do. The desktop parses both manifests and compares their values before installation. Copying the manifest from the built package avoids accidental differences.

## Entry fields

Unknown entry fields are rejected. Localized text is an object with exactly `en` and `ru`, each containing a non-empty string. Unless a different limit is listed, entry-localized strings are limited to 1,000 characters by the validator.

| Field | Required | Type and constraints |
| --- | --- | --- |
| `id` | Yes | Plugin ID; must equal `manifest.id` and the filename without `.json`. Up to 100 characters, lowercase letters, digits, dots, and hyphens; starts with a letter or digit. The host also rejects `..` and a trailing dot. Keep it stable across versions. |
| `publisher` | Yes | Displayed author or organization, 1–200 characters. This is metadata, not a verified identity or signature. |
| `category` | Yes | An ID from `marketplace.base.json`, up to 100 characters. Current categories: `productivity`, `meetings`, `notes`. |
| `keywords` | Yes | Array of at most 20 strings used for discovery. Use concise, relevant terms; an empty array is allowed. |
| `updatedAt` | Yes | Non-empty date string, up to 30 characters. Use `YYYY-MM-DD` for the date of the catalog update. |
| `manifest` | Yes | Complete manifest copied from the package. See [Package manifest](#package-manifest) and the SDK reference. |
| `source` | Yes | A GitHub commit or release source object; fields are listed below. |
| `sha256` | Yes | Exactly 64 lowercase hexadecimal characters: SHA-256 of the complete package bytes. |
| `changelog` | Yes | Localized description of this version's changes. For an initial release, describe what it provides. |
| `overview` | No | Localized Markdown object with both `en` and `ru`. Each value must be non-empty and at most 20,000 UTF-8 bytes. Raw HTML is rejected in either language. Describe behavior, setup, access requirements, and limitations. |
| `repository` | No | HTTPS URL on `github.com`, up to 2,048 characters. May link to the plugin directory at a pinned commit. No credentials or explicit port. |
| `screenshots` | No | Array of up to 10 screenshot objects. An empty array is allowed. |

If supplied, `overview` must include both translations, for example `{ "en": "# Overview\n\nWhat the plugin does.", "ru": "# Описание\n\nЧто делает плагин." }`. A plain string or an object with a missing translation is rejected for public catalog entries. The validator checks the UTF-8 byte limit as well as the JSON Schema's character limit, so multibyte text must fit the same 20,000-byte budget. The desktop chooses the matching translation; separate localized text keeps English and Russian descriptions readable without mixing languages in one Markdown document.

### Package manifest

Copy the whole manifest from the package rather than reconstructing it from catalog metadata. For this catalog, `id` must match the entry, `apiVersion` must be the number `1`, and `version` must be a semantic version. Every requested permission must exist in [schema/permissions.json](schema/permissions.json), appear only once, and be supported by the desktop. The desktop also checks the complete package contract.

The SDK documents [manifest fields and permissions](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/manifest-and-permissions.md), [UI slots](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/ui-slots.md), and [runtime behavior](https://github.com/sobes-tech/plugin-sdk/blob/main/docs/en/runtime-and-build.md).

### Package sources

Only the two source forms below are accepted. Unknown source fields are rejected.

| Field | Required for | Constraints |
| --- | --- | --- |
| `type` | Both | `"github"` or `"release"`. |
| `repository` | Both | `owner/repository`, not a URL. Use letters, digits, dots, underscores, or hyphens in each part. |
| `revision` | `github` | Full 40-character lowercase hexadecimal commit SHA. Branch names and abbreviated SHAs are rejected. |
| `path` | `github` | Package path within that commit, up to 300 characters. Each segment uses letters, digits, dots, underscores, or hyphens; no empty, `.` or `..` segments. |
| `tag` | `release` | Non-empty release tag, up to 128 characters. |
| `asset` | `release` | Exact asset filename, up to 200 characters; letters, digits, dots, underscores, or hyphens, without directory separators. |

Commit sources resolve to `https://raw.githubusercontent.com/<repository>/<revision>/<path>`. Release sources resolve to `https://github.com/<repository>/releases/download/<tag>/<asset>`, with the tag and asset URL-encoded.

Prefer immutable commit sources. For releases, never replace an asset or move its tag after review: release names are not inherently immutable, so the checksum remains the content pin. A changed remote file fails verification; it is not silently accepted. Downloads and their redirects must stay on the allowed GitHub content/release hosts. Private packages that require credentials are unsuitable for this public catalog.

### Screenshots

| Field | Required | Constraints |
| --- | --- | --- |
| `url` | Yes | HTTPS image URL on `github.com`, `raw.githubusercontent.com`, or `user-images.githubusercontent.com`, up to 2,048 characters. No credentials or explicit port. |
| `caption` | No | Localized text with `en` and `ru`, up to 500 characters each. |

Use real screenshots of the submitted version with sample data and no credentials or personal information. Link to the image itself, preferably at a pinned commit in `assets/`, rather than an HTML preview page. Screenshots and descriptive metadata are part of the review; they are not fetched or authenticated by the remote package check.

## Catalog identity and categories

For a separate catalog, retain the same document shape. The build script combines `marketplace.base.json` with sorted `entries/*.json` files:

| Field | Required | Meaning |
| --- | --- | --- |
| `schemaVersion` | Yes | The number `1`. |
| `name` | Yes | Stable catalog identifier. |
| `displayName` | Yes | Localized catalog name. |
| `categories` | Yes | Array of `{ id, title }`, where `title` is localized and `id` is referenced by entry `category`. The desktop accepts at most 100 categories. |
| `plugins` | Yes, generated | Entry array. The desktop accepts at most 500 plugins and a catalog document up to 4 MiB. |

Add or rename an official category through a reviewed change to `marketplace.base.json`, updating affected entries together. Category membership is checked during index generation.

## Validate changes

Use Bun; the checks do not need a dev server or a running desktop:

```sh
bun install --frozen-lockfile
bun run lint
bun run format:check
bun run build
bun run check
bun run test
```

| Command | What it checks or changes |
| --- | --- |
| `bun run format` | Formats source and configuration files, including blank lines between logical blocks. Generated catalog data is excluded. |
| `bun run format:check` | Checks source and configuration formatting without writing files. |
| `bun run lint` | Checks code and required spacing between declarations and statements. |
| `bun run build` | Validates local entry metadata, IDs, categories, permission IDs, and source syntax; writes the deterministic `marketplace.json`. |
| `bun run check` | Performs the same local validation and fails if the checked-in index differs from generated output. Does not write files or contact package sources. |
| `bun run test` | Runs validator unit tests in isolated Bun processes. |
| `bun run check:remote` | Performs the local check, downloads each referenced package, verifies its checksum and manifest, and checks the final download host. Does not execute plugin code. |

Run `bun run check:remote` after the source commit or release asset is publicly accessible. It intentionally fails for unpublished commits, unavailable assets, or mismatched bytes. A local `build`/`check` pass does not prove that GitHub serves the package. CI runs lint, formatting checks, tests, and the remote check, so publish the immutable package source before submitting a catalog change for passing CI.

## Review, installation, and updates

Submit the entry and regenerated index in one pull request. Review includes executable code, requested permissions and domains, publisher/source changes, descriptions, and screenshots. Do not put secrets or account tokens in a package or entry. A checksum detects changed bytes; it does not establish that the code or publisher is trustworthy.

Complete the [submission checklist](.github/pull_request_template.md) and provide the applicable licenses and dependency notices. A maintainer's independent approval must cover the submitted revision and package hash. Follow [SECURITY.md](SECURITY.md) when a released package is reported as malicious or compromised; delisting alone does not disable installed copies.

Refreshing a catalog updates metadata only. The user explicitly installs a package after reviewing its manifest and requested access. The desktop verifies the complete package checksum, matching manifest, supported API/features, and permissions before installation. Dependencies and build scripts are not downloaded or run on the user's machine.

For an update, keep the plugin ID, increment the package's semantic version, publish new immutable bytes, and update its manifest, source pin, checksum, date, and changelog together. Source, ownership, permissions, branding, and screenshots still require review. A newer semantic version appears as an available update; an older version is labeled as older, not as an update. Equal versions and build-metadata-only differences are not update notifications. Users explicitly approve updates and any changed access.

The desktop does not embed plugin packages or a catalog snapshot. Plugin code and packages live in their source repositories; this repository supplies catalog metadata. Installing from a catalog downloads the selected package and verifies its checksum and manifest.

## Connect another catalog

In Sobes, open **Plugins → Marketplace → GitHub catalogs**. Add an `owner/repository`, a GitHub repository URL, or an HTTPS `raw.githubusercontent.com` JSON URL. Repository forms resolve to `main/marketplace.json`; use a raw URL when the index lives elsewhere. Catalog URLs cannot contain credentials, query strings, fragments, or explicit ports.

The official catalog remains connected. Removing a custom catalog does not uninstall packages previously approved by the user. If a catalog request fails, the desktop can retain its last successfully loaded metadata in the current session and identifies the unavailable source. This does not bypass package integrity checks or approve an installation.
