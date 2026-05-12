# Alloy v3 Sync — Design

**Date:** 2026-05-12
**Status:** Approved — ready for implementation plan
**Branch:** `chore/sync-alloy-v3` (off `develop`)

## 1. Goal & scope

Bring `alloy-devkit` (currently mirroring Alloy 1.15.2 plus a handful of cherry-picks) up to **Alloy v3.0.0**. Major-version jump for devkit consumers; breaking changes are accepted.

### In scope (mirrored from upstream)

| Upstream path | Devkit path |
| --- | --- |
| `Alloy/commands/compile/**` | `packages/alloy-compiler/lib/**` |
| `Alloy/builtins/**` | `packages/alloy-compiler/builtins/**` (vendored as-is) |
| `Alloy/template/{component,model}.js`, `wpath.js` | `packages/alloy-compiler/template/**` |
| `Alloy/common/`, `Alloy/utils.js`, `Alloy/logger.js`, `Alloy/tiapp.js`, `Alloy/grammar/` | `packages/alloy-utils/lib/**` |

Engine constraint: `engines.node` becomes `>=20.18.1` in both packages.

### Out of scope

- `Alloy/commands/{new,copy,move,debugger,extract-i18n,generate,info,install,purgetss,remove,test}` and `plugin/` — devkit is library-only, no CLI.
- Upstream CI / release plumbing.
- Upstream copyright header churn (`86791bc5`) — touches no mirrored files. Devkit's own attribution is handled in Wave 7.

### Outputs

- `alloy-compiler@1.0.0` and `alloy-utils@1.0.0` published locally on the branch (not pushed to npm by this sync).
- `docs/DEVKIT_DELTAS.md` — record of intentional deviations from upstream for future syncs.

## 2. Strategy

**Wave-by-wave hand-port.** Cherry-picking is not viable: file paths differ (`Alloy/commands/compile/parsers/` → `packages/alloy-compiler/lib/parsers/`) and the import convention differs (`require('../../../utils')` → `require('alloy-utils').utils`). Each wave hand-translates a topic cluster of upstream commits into devkit's layout.

**Commit granularity.** One commit per wave (~7 commits total). The commit body lists every upstream SHA the wave carries.

**Test policy.** Tests must pass after every wave. Tests for newly-ported parsers (Wave 1) are allowed to land in a single final test-authoring commit at the end of the branch.

**`references/` directory.** Local working copy of upstream Alloy. Fully gitignored. Used for diffing during the sync; not tracked.

## 3. Pre-flight cleanup

One commit before any wave starts.

1. **Uncommitted edits.**
   - Discard the revert in `packages/alloy-compiler/template/component.es6.js`; restore `1f307fc`'s `export default function Controller()`.
   - Keep the `const` patch in `packages/alloy-compiler/lib/parsers/Alloy.Abstract.Option.js`. Add an inline comment pointing at `docs/DEVKIT_DELTAS.md`.
2. **Delete stray files.**
   - `packages/alloy-compiler/lib/parsers/Ti.UI.OptionBar copy.js`
   - `packages/alloy-compiler/lib/parsers/Ti.UI.iPhone.NavigationGroup.js` (removed upstream; no downstream consumers).
3. **`.gitignore`.** Add `.DS_Store`, `**/.DS_Store`, `references/`. Remove any tracked `.DS_Store` files.
4. **Create `docs/DEVKIT_DELTAS.md`.** Initial content per Section 5.
5. **Add smoke fixture.** Minimal Alloy project under `test/fixtures/smoke/` (one `tiapp.xml`, one controller with view+style+controller, one model, one widget) plus a golden output directory `test/fixtures/smoke/__golden__/` capturing the *current* compiled output.
6. **Establish test baseline.** Run `pnpm -F alloy-compiler test` and `pnpm -F alloy-utils test`; record the passing count in the pre-flight commit message. This is the floor every wave must meet.

## 4. Sync waves

Each wave is one commit. Commit body lists upstream SHAs.

### Wave 1 — Missing parser files

Port the 10 parser files from `31328743` that weren't picked up in devkit's earlier `2580792` pass:

- `Ti.UI.ActivityIndicator.js`
- `Ti.UI.Column.js`
- `Ti.UI.MaskedImage.js`
- `Ti.UI.Notification.js`
- `Ti.UI.ProgressBar.js`
- `Ti.UI.RefreshControl.js`
- `Ti.UI.Row.js`
- `Ti.UI.SearchBar.js`
- `Ti.UI.Shortcut.js`
- `Ti.UI.ShortcutItem.js`

Rewrite imports to devkit convention: `require('alloy-utils').utils`, `require('alloy-utils').logger`.

### Wave 2 — Parser fixes

- `4f86263c`, `6d4b36a9`, `850e8990`, `7c038dfd` → `Alloy.Abstract._ItemContainer.js`: restore `CU.isNodeForCurrentPlatform` guard.
- `ce5b4b13` → `Ti.UI.OptionDialog` cancel-option fix.
- `819d1142` → missing-includes fix.
- `f9161306` → verify `Ti.UI.PickerColumn.js` parity (likely no-op).

### Wave 3 — Controller / AST emit

- `d4444bc0`, `02063e8b`, `ffdcd3b6`, `795685c3`, `296376cd`, `fe846c09` → `ast/controller.js` (else-case, optional chaining).
- `9ca4cd6e` → reduce empty lines in controllers.
- `8c7abb5e`, `a4591fef` → trim ES6 mods (production-build newline trimming).
- `5cf47147` → models-length fix.
- `e45d9300`, `f5cbdd5e` → BaseController error reporting + no-proxy guard.

Re-verify the `Alloy.Abstract.Option.js` `const` patch still applies; update `docs/DEVKIT_DELTAS.md` if upstream's emit shape changed.

Snapshot updates land inside this same wave commit per Section 6, not as a separate commit (preserves the one-commit-per-wave rule from Section 2).

### Wave 4 — Compile / sourcemap

- `537107de` → `path.join` in `sourceMapper.js`.
- `b1259b1f` → skip widget sourcemaps when disabled.
- `ba8d4c22` → generate sourcemaps for widget lib files.
- `ba0068ed` → pass filename to babel transform. Flag in changelog (enables `.babelrc` discovery).

### Wave 5 — Builtins / runtime / lang

- `30d9f88c`, `d91b4364`, `9f273a67` → Backbone 1.6.0 (replace `builtins/backbone.js`; update compiler-side hooks).
- `fb845f73`, `694070b5` → default backbone version constant in `alloy-utils/lib/constants.js`.
- `36b2fc87` → underscore 1.13.6.
- `98bb1c47` → updated Alloy lang files.
- `29a8a54c` → updated Alloy defaults.
- `88db7d96` → verify jsonlint parity (devkit on `@prantlf/jsonlint` ^16; likely no change).

Backbone hooks may span both packages; the wave commit may need to touch `alloy-compiler` and `alloy-utils` atomically.

### Wave 6 — Dependencies / housekeeping

- `244a935e` → remove `chmodr` from `packages/alloy-compiler/package.json` and any call sites. Grep first to confirm no devkit-only usage.
- Bump `engines.node` to `>=20.18.1` in both packages and at the top level.
- Bump dep ranges (`@babel/*` ^7.20+, etc.) to match upstream v3 `package.json`.
- `packages/alloy-compiler/package.json` and `packages/alloy-utils/package.json` → `1.0.0`. `alloy-compiler`'s dep on `alloy-utils` → `^1.0.0`. `lerna.json` → `1.0.0` if tracked.
- `052b80b8` → final cleanup pass.

Skipped: `86791bc5` (out of mirror scope), `319c7553` (only relevant if devkit tests fail — handled by per-wave gate).

### Wave 7 — Attribution rebrand (devkit-only)

- `author` in both `package.json` files: `"Axway Appcelerator"` → `"TiDev, Inc."`.
- `repository.url`: verify current canonical repo before changing.
- Top-level `LICENSE` copyright holder and year.
- `README.md` references to Appcelerator/Axway where they refer to project ownership (not historical "this is a mirror of Alloy's compile command" context).
- Leave `homepage` unless the repo has actually moved.

### Deferred test commit

After Wave 7, one commit adds unit tests for the 10 newly-ported parsers from Wave 1, following the pattern in `packages/alloy-compiler/test/unit`. Production code is not modified.

### Changelog entry

Single entry at the top of `CHANGELOG.md` summarizing the v3 alignment and breaking changes: node ≥20.18.1, generated-controller shape differences (Wave 3), backbone/underscore/moment major bumps (Wave 5), `chmodr` removed (Wave 6), `.babelrc` discovery enabled (Wave 4).

## 5. Devkit deltas (`docs/DEVKIT_DELTAS.md`)

Intentional deviations from upstream that future syncs must preserve:

1. **Path/import convention.** All parsers and lib files use `require('alloy-utils').{utils,logger}` instead of upstream's `require('../../../utils')` / `require('../../../logger')`. Structural rule; not a per-file delta.
2. **Package split.** Upstream is one CLI; devkit is two libraries (`alloy-compiler` + `alloy-utils`). Out-of-scope upstream code listed in Section 1.
3. **`Alloy.Abstract.Option.js` `const` patch.** Local fix on top of `24bcf75`/`93c2df14`: emit `const ${attrVarName} = …` instead of bare `${attrVarName} = …` to avoid implicit-global assignment in strict mode. Inline comment in the file points back to this entry.
4. **`Ti.UI.iPhone.NavigationGroup.js` removal.** Removed during pre-flight; upstream removed it earlier. Documented so a future sync doesn't re-add it as "missing file."
5. **Template variants.** `component.es6.js`, `model.es6.js` — devkit-only ES6-export templates with no upstream counterpart. Out of upstream sync scope.

## 6. Verification protocol

Per-wave gate, in order:

1. **Lint.** Run `pnpm -F alloy-compiler lint` / `pnpm -F alloy-utils lint` if scripts exist. Don't introduce lint as part of the sync.
2. **Unit tests.** Pass rate must be ≥ pre-flight baseline. Existing tests may be updated inside the wave commit if the wave changes observable behavior (e.g., snapshot updates for Wave 3); the test diff is reviewed alongside the source change, not silently regenerated.
3. **Smoke fixture.** Compile `test/fixtures/smoke/` with the devkit compiler. Diff against `__golden__/`. Expected diffs at Waves 3 and 5; review and commit a new golden alongside the wave.
4. **No `console.log` / debugger** sneaking through. Quick grep.

Branch is shippable at every commit. New-surface-area tests deferred to the final test-authoring commit.

## 7. Versioning & release

- `alloy-compiler`: `0.2.7` → `1.0.0`.
- `alloy-utils`: `0.2.7` → `1.0.0`.
- `alloy-compiler`'s dep on `alloy-utils` → `^1.0.0`.
- `engines.node` `>=20.18.1` in both packages and at top level.
- `lerna.json` → `1.0.0` if it tracks package versions.

**Publish.** Out of scope for this sync. Versions are bumped on the branch; the publish step is the user's call after merge.

**PR description.** Summarizes user-visible breaking changes so consumers bumping to `^1.0.0` know what to expect.

## 8. Known unknowns & risks

Re-evaluated per wave; the wave commit message notes any resolution. None block starting the sync.

1. **Backbone hooks coupling (Wave 5).** Backbone-version detection may live in `alloy-utils/lib/constants.js` while compiler hooks live in `alloy-compiler/lib/`. The wave commit may need to touch both packages atomically. Risk: medium.
2. **Generated-code snapshot drift (Wave 3).** `9ca4cd6e`, `8c7abb5e`, `a4591fef` change whitespace and newline emission. Snapshot tests will fail. Plan: update snapshots in-commit (alongside the code change, in the same wave commit per Section 2). If the snapshot diff is too large to review in one pass, treat it as an execution-time concern — review in chunks but commit atomically.
3. **Babel filename arg (`ba0068ed`, Wave 4).** Enables `.babelrc` / `babel.config.js` discovery. Behavior change for downstream apps that happen to have one. Flag in changelog.
4. **`chmodr` removal (Wave 6).** Grep devkit for `chmodr` usage outside what upstream removes — if devkit added its own chmod-needing call site, the dep stays.
5. **Lang files (`98bb1c47`) and Alloy defaults (`29a8a54c`) (Wave 5).** Ship runtime data downstream apps consume. Downstream apps depending on specific default strings will see a behavior break. Flag in changelog; cannot mitigate without breaking the sync.
6. **`@xmldom/xmldom` version (Wave 6).** Devkit on `^0.8.10`. Verify upstream v3 version during the wave.
7. **No test coverage for Waves 4–5.** Compile/sourcemap and vendored builtins likely lack unit-test coverage. Smoke fixture is the only gate. Accepted risk — adding coverage for vendored builtins is out of scope.

## 9. Execution checklist

- [ ] Pre-flight commit (Section 3)
- [ ] Wave 1 — Missing parser files
- [ ] Wave 2 — Parser fixes
- [ ] Wave 3 — Controller / AST emit
- [ ] Wave 4 — Compile / sourcemap
- [ ] Wave 5 — Builtins / runtime / lang
- [ ] Wave 6 — Dependencies / housekeeping
- [ ] Wave 7 — Attribution rebrand
- [ ] Deferred test commit (new parser tests)
- [ ] Changelog entry
- [ ] PR description with breaking-change summary
