import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportDir = path.join(projectRoot, "out");
const noJekyllSource = path.join(projectRoot, "public", ".nojekyll");
const noJekyllTarget = path.join(exportDir, ".nojekyll");

await mkdir(exportDir, { recursive: true });

try {
  await copyFile(noJekyllSource, noJekyllTarget);
} catch {
  await writeFile(noJekyllTarget, "", "utf8");
}