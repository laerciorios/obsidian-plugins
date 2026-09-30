# CLAUDE.md — obsidian-plugins

Monorepo of personal Obsidian plugins by Laercio Rios. Planning and specs live in the user's vault at `~/Documents/Obsidian/laerciorios/1 - Knowledge/Projects/Obsidian Plugins/` (specs in `_Discovery/AI Generated/<id>-spec.md`). Chat replies to the user are in Brazilian Portuguese.

## Layout

- `plugins/<id>/` — one plugin per folder, official sample-plugin shape: `src/main.ts`, `manifest.json`, `styles.css`, `versions.json`, `package.json` (scripts + workspace dependencies only), `tsconfig.json` extending `../../tsconfig.base.json`, `src/i18n/` with the plugin's message catalogs.
- `packages/<name>/` — shared code. Create only when a second plugin needs the same code; consume with `"workspace:*"` (esbuild bundles it).
  - `packages/i18n/` (`@obsidian-plugins/i18n`) — translation helper used by every plugin: `createI18n({ en, 'pt-BR': ptBR })` returns `t(key, params)`, following the Obsidian app language (`getLanguage()`) and falling back to English.
  - `packages/core-plugins/` (`@obsidian-plugins/core-plugins`) — behave like the core plugins without internal APIs: Daily notes settings (`readDailyNotesSettings`, `dailyNotePath`, `dailyNoteDate`) and Templates variables (`fillTemplate`). Used by Shortcuts, Vault Structure and Daily Work Log.
- `scripts/esbuild.mjs` — the shared build. Output `plugins/<id>/dist/{main.js,manifest.json,styles.css}`, then copied to `dev-vault/.obsidian/plugins/<id>/` and to every vault listed in `.dev-targets.json` (git-ignored, managed by `pnpm link-plugin`). Dev mode writes `.hotreload` in the targets.
- `templates/plugin/` — scaffold used by `pnpm new-plugin`. Placeholders: `__ID__`, `__NAME__`, `__CLASS__`, `__DESCRIPTION__`.
- `dev-vault/` — committed test vault with fake data. Its `.obsidian/plugins/` is generated and git-ignored.

## Commands

- `pnpm install` once at the root (all tooling is hoisted there).
- `pnpm --filter <id> dev` / `pnpm build` / `pnpm check` (typecheck + lint).
- `pnpm new-plugin <id> "Name" ["description"]`, `pnpm link-plugin <id> <vault>`, `pnpm bump <id> <x.y.z>`, `pnpm setup:dev-vault`.

## Rules

- **Never develop against the real vault.** Test in `dev-vault/` first. The real vault only receives builds after an explicit `pnpm link-plugin`. Never install Hot Reload in the real vault (it can enable plugins on its own).
- **Test data is fictional.** `dev-vault/` notes, test checklists, READMEs and code comments use invented people, companies and projects only, never names from the user's vault. Real examples stay in the vault's spec. Plugin defaults may encode conventions (folder names, frontmatter keys) but never note names.
- Plugin ids, Bases view ids and command ids are stable API: never rename after first use (`.base` files store the view id in `type:`).
- New plugins only via `pnpm new-plugin`. Ids are kebab-case and must not contain "obsidian".
- A plugin that replaces an installed community plugin (e.g. Colored Text) must either use a different id or the community plugin must be uninstalled first. `link-plugin` refuses to copy over a folder whose `manifest.json` has another author.
- `main.ts` stays minimal (lifecycle + registrations). Feature logic in modules; split files over ~300 lines.
- No runtime dependencies unless clearly justified; everything is bundled into `main.js`.
- Clean up through `this.register*` helpers (`registerEvent`, `registerDomEvent`, `registerInterval`) so unload/hot reload never leaks.
- Write to notes only through `app.fileManager.processFrontMatter` (or `app.vault.process`), never by rewriting the whole file from a cached copy.
- Styles: only Obsidian CSS variables (`--background-*`, `--text-*`, `--color-*`, `--size-*`, `--radius-*`), no hard-coded colors. Prefix classes per plugin (`bb-` for Bases Board).
- **Every plugin is multi-language.** All user-facing text (view and command names, settings, options, placeholders, notices, aria-labels, empty states) goes through `t()` from `src/i18n/`; no UI literals elsewhere. `en.ts` is the source (`satisfies Messages`) and the fallback; `pt-br.ts` is typed `Translation<typeof en>`, so a missing key fails the typecheck. Keep `{param}` placeholders identical in every locale. A new language is a new file plus one entry in `createI18n`.
- Values written to notes or matched in content (frontmatter values like `todo`/`done`, trigger keywords) are data, not UI: never translate them. Defaults persisted to `data.json` are translated once, when created.
- Code, identifiers and comments in English. `manifest.json` descriptions in English (they cannot be localized). READMEs in Brazilian Portuguese. UI copy in sentence case in every language.
- Never commit `main.js`, `dist/`, `node_modules/`, `.dev-targets.json`.
- Run `pnpm check` before committing. Release = `pnpm bump <id> <x.y.z>` + `pnpm --filter <id> build` + tag `<id>-<x.y.z>`.
- Keep `minAppVersion` accurate when using newer APIs (Bases view API: 1.10.0; `file`/`folder`/`formula` options and `createFileForView`: 1.10.2; declarative settings via `getSettingDefinitions`: 1.13.0).

## References

- API typings: `node_modules/obsidian/obsidian.d.ts` (search `BasesView`, `BasesViewConfig`, `registerBasesView`).
- Editor extensions import `@codemirror/state`, `/view` and `/language`: Obsidian provides them at runtime (esbuild externals, `import/core-modules` in `eslint.config.mjs`), and the root devDependencies carry only their types, pinned by `overrides` in `pnpm-workspace.yaml` to the versions Obsidian declares as peers.
- Bases view guide: https://docs.obsidian.md/plugins/guides/bases-view
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
