# CLAUDE.md — obsidian-plugins

Monorepo of personal Obsidian plugins by Laercio Rios. Planning and specs live in the user's vault at `~/Documents/Obsidian/laerciorios/1 - Knowledge/Projects/Obsidian Plugins/` (specs in `_Discovery/AI Generated/<id>-spec.md`). Chat replies to the user are in Brazilian Portuguese.

## Layout

- `plugins/<id>/` — one plugin per folder, official sample-plugin shape: `src/main.ts`, `manifest.json`, `styles.css`, `versions.json`, `package.json` (scripts only, no dependencies), `tsconfig.json` extending `../../tsconfig.base.json`.
- `packages/<name>/` — shared code. Create only when a second plugin needs the same code; consume with `"workspace:*"` (esbuild bundles it).
- `scripts/esbuild.mjs` — the shared build. Output `plugins/<id>/dist/{main.js,manifest.json,styles.css}`, then copied to `dev-vault/.obsidian/plugins/<id>/` and to every vault listed in `.dev-targets.json` (git-ignored, managed by `pnpm link-plugin`). Dev mode writes `.hotreload` in the targets.
- `templates/plugin/` — scaffold used by `pnpm new-plugin`. Placeholders: `__ID__`, `__NAME__`, `__CLASS__`, `__DESCRIPTION__`.
- `dev-vault/` — committed test vault with fake data. Its `.obsidian/plugins/` is generated and git-ignored.

## Commands

- `pnpm install` once at the root (all tooling is hoisted there).
- `pnpm --filter <id> dev` / `pnpm build` / `pnpm check` (typecheck + lint).
- `pnpm new-plugin <id> "Name" ["description"]`, `pnpm link-plugin <id> <vault>`, `pnpm bump <id> <x.y.z>`, `pnpm setup:dev-vault`.

## Rules

- **Never develop against the real vault.** Test in `dev-vault/` first. The real vault only receives builds after an explicit `pnpm link-plugin`. Never install Hot Reload in the real vault (it can enable plugins on its own).
- Plugin ids, Bases view ids and command ids are stable API: never rename after first use (`.base` files store the view id in `type:`).
- New plugins only via `pnpm new-plugin`. Ids are kebab-case and must not contain "obsidian".
- `main.ts` stays minimal (lifecycle + registrations). Feature logic in modules; split files over ~300 lines.
- No runtime dependencies unless clearly justified; everything is bundled into `main.js`.
- Clean up through `this.register*` helpers (`registerEvent`, `registerDomEvent`, `registerInterval`) so unload/hot reload never leaks.
- Write to notes only through `app.fileManager.processFrontMatter` (or `app.vault.process`), never by rewriting the whole file from a cached copy.
- Styles: only Obsidian CSS variables (`--background-*`, `--text-*`, `--color-*`, `--size-*`, `--radius-*`), no hard-coded colors. Prefix classes per plugin (`bb-` for Bases Board).
- Code, identifiers and comments in English. User-facing strings (UI, notices) and READMEs in Brazilian Portuguese. UI copy in sentence case.
- Never commit `main.js`, `dist/`, `node_modules/`, `.dev-targets.json`.
- Run `pnpm check` before committing. Release = `pnpm bump <id> <x.y.z>` + `pnpm --filter <id> build` + tag `<id>-<x.y.z>`.
- Keep `minAppVersion` accurate when using newer APIs (Bases view API: 1.10.0; `file`/`folder`/`formula` options and `createFileForView`: 1.10.2).

## References

- API typings: `node_modules/obsidian/obsidian.d.ts` (search `BasesView`, `BasesViewConfig`, `registerBasesView`).
- Bases view guide: https://docs.obsidian.md/plugins/guides/bases-view
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
