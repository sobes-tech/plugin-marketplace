import { resolve } from "node:path";
import { validateUpdates } from "./updates";

const index = process.argv.indexOf("--base");
const base = index < 0 ? "HEAD" : process.argv[index + 1];

if (!base || !(base === "HEAD" || /^[a-f0-9]{40}$/i.test(base))) {
  throw new Error("--base must be HEAD or a full commit SHA");
}

const root = resolve(import.meta.dir, "..");
let previous: unknown = { plugins: [] };

if (base !== "0".repeat(40)) {
  const result = Bun.spawnSync(["git", "show", `${base}:marketplace.json`], { cwd: root });

  if (result.exitCode !== 0) {
    throw new Error("Cannot read the trusted base catalog");
  }

  previous = JSON.parse(result.stdout.toString());
}

validateUpdates(previous, await Bun.file(resolve(root, "marketplace.json")).json());
console.log("Package versions and source repositories match the published baseline");
