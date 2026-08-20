// Zips just the files Chrome Web Store needs (manifest + runtime code/data +
// icons) - none of the dev tooling (scripts/, node_modules/, README, docs/).
//
//   npm run package

import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST_DIR = path.join(ROOT, "dist");
const OUT_ZIP = path.join(DIST_DIR, "tli-hero-rank-korean-extension.zip");

const INCLUDE = ["manifest.json", "src", "data", "icons"];

async function main() {
  await mkdir(DIST_DIR, { recursive: true });
  await rm(OUT_ZIP, { force: true });

  const paths = INCLUDE.map((p) => path.join(ROOT, p));
  const psCommand = `Compress-Archive -Path ${paths
    .map((p) => `"${p}"`)
    .join(",")} -DestinationPath "${OUT_ZIP}" -Force`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", psCommand], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Compress-Archive failed with exit code ${result.status}`);
  }

  console.log(`Wrote ${OUT_ZIP}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
