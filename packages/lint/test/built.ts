// The built plugin that the suites running a real linter load:
// dist/index.js, or the file SHADCN_LINT_PLUGIN points at.

import * as fs from "node:fs"
import { createRequire } from "node:module"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

export const PKG_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)

export const plugin = process.env.SHADCN_LINT_PLUGIN
  ? path.resolve(process.env.SHADCN_LINT_PLUGIN)
  : path.join(PKG_DIR, "dist/index.js")

// The newest mtime under src/, so a build older than the source is
// recognized as stale rather than failing tests that are about the
// source. `pnpm test` builds first; SHADCN_LINT_PLUGIN names a side
// build explicitly and is trusted.
function newestSourceMtime(dir: string): number {
  let newest = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    newest = Math.max(
      newest,
      entry.isDirectory() ? newestSourceMtime(full) : fs.statSync(full).mtimeMs
    )
  }
  return newest
}

export const buildUsable = (() => {
  if (!fs.existsSync(plugin)) return false
  if (process.env.SHADCN_LINT_PLUGIN) return true
  return (
    fs.statSync(plugin).mtimeMs >= newestSourceMtime(path.join(PKG_DIR, "src"))
  )
})()

// A linter's own entry, run with an explicit runtime: `npx` resolved it
// through a cmd.exe shim on Windows, where the resolution alone could
// take longer than a run and time the test out on a slow runner.
export function binOf(name: string) {
  const require = createRequire(import.meta.url)
  const manifest = require.resolve(`${name}/package.json`)
  const bin = require(manifest).bin
  return path.join(
    path.dirname(manifest),
    typeof bin === "string" ? bin : bin[name]
  )
}
