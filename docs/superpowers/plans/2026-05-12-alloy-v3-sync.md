# Alloy v3 Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `alloy-devkit` up to Alloy v3.0.0 via a 7-wave hand-port, one commit per wave, tests passing after every wave.

**Architecture:** Hand-port topic clusters of upstream commits into devkit's two-package layout (`alloy-compiler`, `alloy-utils`). Paths and import conventions rewritten per devkit norms. Spec: `docs/superpowers/specs/2026-05-12-alloy-v3-sync-design.md`.

**Tech Stack:** Node.js (target `>=20.18.1`), pnpm workspaces, lerna, jest (with inline snapshots), eslint.

**Branch:** `chore/sync-alloy-v3` off `develop`.

**Deviations from spec — read before starting:**
- Spec calls for a new `test/fixtures/smoke/` directory; the existing `packages/alloy-compiler/test/unit/fixtures/test-app/` already serves this purpose. The smoke gate reuses `test-app` and is enforced via a new end-to-end snapshot test added during pre-flight. No separate fixture is created.
- Pre-flight additionally fixes a pre-existing latent bug in `packages/alloy-compiler/lib/parsers/Ti.UI.OptionBar.js` whose imports point at nonexistent paths (`require('../../../tiapp')` resolves to `packages/tiapp` which doesn't exist). This is the same import-rewrite rule already documented in `DEVKIT_DELTAS.md` item 1, applied to a file that was missed during an earlier sync.

**Reference repo:** Upstream Alloy v3.0.0 is checked out under `references/alloy/` (gitignored, local-only). Commands using upstream paths assume this layout.

---

## Reference: upstream-to-devkit path mapping

| Upstream file | Devkit destination |
| --- | --- |
| `references/alloy/Alloy/commands/compile/parsers/X.js` | `packages/alloy-compiler/lib/parsers/X.js` |
| `references/alloy/Alloy/commands/compile/ast/X.js` | `packages/alloy-compiler/lib/ast/X.js` |
| `references/alloy/Alloy/commands/compile/{sourceMapper,optimizer,styler,compilerUtils}.js` | `packages/alloy-compiler/lib/{sourceMapper,optimizer,styler,compilerUtils}.js` |
| `references/alloy/Alloy/builtins/X.js` | `packages/alloy-compiler/builtins/X.js` |
| `references/alloy/Alloy/template/{component,model}.js`, `wpath.js` | `packages/alloy-compiler/template/{component,model}.js`, `wpath.js` |
| `references/alloy/Alloy/common/constants.js` | `packages/alloy-utils/lib/constants.js` |
| `references/alloy/Alloy/{utils,logger,tiapp}.js` | `packages/alloy-utils/lib/{utils,logger,tiapp}.js` |

**Import-rewrite rule (DEVKIT_DELTAS.md #1):**
- `require('../../../utils')` → `require('alloy-utils').utils`
- `require('../../../logger')` → `require('alloy-utils').logger`
- `require('../../../tiapp')` → `require('alloy-utils').tiapp`
- `require('../../../common/constants')` → `require('alloy-utils').constants`

Apply this rewrite to every file ported in this plan unless explicitly noted otherwise.

---

## Pre-flight: clean tree + smoke gate

**Files:**
- Modify: `packages/alloy-compiler/template/component.es6.js`
- Modify: `packages/alloy-compiler/lib/parsers/Alloy.Abstract.Option.js`
- Modify: `packages/alloy-compiler/lib/parsers/Ti.UI.OptionBar.js`
- Delete: `packages/alloy-compiler/lib/parsers/Ti.UI.OptionBar copy.js`
- Delete: `packages/alloy-compiler/lib/parsers/Ti.UI.iPhone.NavigationGroup.js`
- Create: `docs/DEVKIT_DELTAS.md`
- Modify: `.gitignore`
- Create: `packages/alloy-compiler/test/unit/smoke.spec.js`

### Steps

- [ ] **Step 1: Create the sync branch**

```bash
git checkout develop
git checkout -b chore/sync-alloy-v3
```

- [ ] **Step 2: Verify pre-flight test baseline**

```bash
pnpm install
pnpm -F alloy-compiler test 2>&1 | tail -20
pnpm -F alloy-utils test 2>&1 | tail -20
```

Record the "Tests: N passed, N total" line from each output. This is the baseline floor — every wave commit must match or exceed this number.

- [ ] **Step 3: Discard the component.es6.js revert**

Restore the file to its committed state (drops the `export function` → `export default function` revert):

```bash
git checkout HEAD -- packages/alloy-compiler/template/component.es6.js
```

Verify the file now contains `export default function Controller()`:

```bash
grep "export default function Controller" packages/alloy-compiler/template/component.es6.js
```

Expected: one match.

- [ ] **Step 4: Annotate the Option.js const patch**

Edit `packages/alloy-compiler/lib/parsers/Alloy.Abstract.Option.js`. Above the `if (attrName)` block at line ~24, add the comment:

```javascript
// DEVKIT DELTA: emit `const` declarations to avoid implicit-global assignment
// in strict mode. See docs/DEVKIT_DELTAS.md item 3.
```

Leave the `const ${attrVarName} = ...` template-string content as-is.

- [ ] **Step 5: Delete stray files**

```bash
git rm "packages/alloy-compiler/lib/parsers/Ti.UI.OptionBar copy.js"
git rm packages/alloy-compiler/lib/parsers/Ti.UI.iPhone.NavigationGroup.js
```

- [ ] **Step 6: Fix broken imports in Ti.UI.OptionBar.js**

Replace the contents of `packages/alloy-compiler/lib/parsers/Ti.UI.OptionBar.js` with:

```javascript
const _ = require('lodash');
const { tiapp, utils: U } = require('alloy-utils');
const MIN_VERSION = '10.0.0';

exports.parse = function (node, state) {
	const tiappSdkVersion = tiapp.getSdkVersion();
	if (tiapp.version.lt(tiappSdkVersion, MIN_VERSION)) {
		U.die(`Ti.UI.OptionBar requires Titanium SDK ${MIN_VERSION}+`);
	}
	return require('./Ti.UI.ButtonBar').parse(node, state);
};
```

(`lodash` is kept even though unused in the current body — preserves parity with upstream and signals intent for future edits. If you prefer YAGNI, drop the `const _` line. Either way is acceptable.)

- [ ] **Step 7: Update `.gitignore`**

Append to `.gitignore`:

```
.DS_Store
**/.DS_Store
references/
```

Remove tracked `.DS_Store` files if any:

```bash
find . -name ".DS_Store" -not -path "./references/*" -not -path "./node_modules/*" -print
git rm --cached -f $(find . -name ".DS_Store" -not -path "./references/*" -not -path "./node_modules/*") 2>/dev/null || true
```

- [ ] **Step 8: Create `docs/DEVKIT_DELTAS.md`**

```markdown
# Devkit Deltas

Intentional deviations from upstream Alloy that future syncs must preserve.

## 1. Path/import convention

All parsers and lib files under `packages/alloy-compiler/lib/` import shared utilities from the `alloy-utils` package rather than via relative paths. This is a structural rule, not a per-file delta — apply mechanically when porting:

- `require('../../../utils')` → `require('alloy-utils').utils`
- `require('../../../logger')` → `require('alloy-utils').logger`
- `require('../../../tiapp')` → `require('alloy-utils').tiapp`
- `require('../../../common/constants')` → `require('alloy-utils').constants`

## 2. Package split

Upstream Alloy ships as a single CLI; devkit splits the compile logic into two libraries: `alloy-compiler` (parsers, AST, compilers, builtins, templates) and `alloy-utils` (utils, logger, tiapp, constants, platforms, grammar). Out-of-scope upstream code: `Alloy/commands/{new,copy,move,debugger,extract-i18n,generate,info,install,purgetss,remove,test}`, `Alloy/plugin/`, top-level CLI bootstrap (`Alloy/alloy.js`).

## 3. `Alloy.Abstract.Option.js` `const` patch

Local fix on top of upstream `93c2df14` (`feat: support using OptionBar`). The upstream emit produces `${attrVarName} = ...` which assigns to an implicit global under strict mode. Devkit emits `const ${attrVarName} = ...` instead. Inline comment in the file points back to this entry.

## 4. `Ti.UI.iPhone.NavigationGroup.js` removed

Removed from devkit during the v3 sync. Upstream removed it earlier; a future sync should not re-add it as "missing file."

## 5. Template variants

`packages/alloy-compiler/template/{component,model}.es6.js` are devkit-only ES6-export-style templates with no upstream counterpart. They sit alongside the upstream-mirrored `component.js` / `model.js`. Out of upstream sync scope.
```

- [ ] **Step 9: Create end-to-end smoke snapshot test**

Create `packages/alloy-compiler/test/unit/smoke.spec.js`:

```javascript
const { setupCompilerFactory, resolveComponentPath } = require('./utils');

describe('smoke: end-to-end compile of test-app fixture', () => {
	const factory = setupCompilerFactory();

	it('compiles the index component end-to-end', () => {
		expect.assertions(1);

		const componentCompiler = factory.createCompiler('component');
		const result = componentCompiler.compile({
			file: resolveComponentPath('controllers', 'index.js')
		});

		// `result.code` is the fully-assembled controller (preCode + viewCode +
		// styleCode + user controller body + postCode), so this single snapshot
		// captures the whole end-to-end output of the component compiler.
		expect(result.code).toMatchSnapshot('component');
	});
});
```

The component compiler internally invokes the view and style compilers (see `packages/alloy-compiler/lib/compilers/component.js:14` and the `viewCompiler.compile` call at line ~51), so one snapshot covers all three.

Uses an external `.snap` file (default for `toMatchSnapshot`) rather than inline snapshots so the diffs at Wave 3 / Wave 5 are reviewable in one place.

- [ ] **Step 10: Run tests to generate baseline snapshot**

```bash
pnpm -F alloy-compiler test
```

Expected: all existing tests pass; the new `smoke.spec.js` runs and writes `packages/alloy-compiler/test/unit/__snapshots__/smoke.spec.js.snap` on first run. Re-run once to confirm:

```bash
pnpm -F alloy-compiler test
```

Expected: snapshot matched; all tests pass.

- [ ] **Step 11: Commit pre-flight**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: pre-flight cleanup for alloy v3 sync

- Discard local export-function override in component.es6.js
- Annotate Alloy.Abstract.Option.js const patch as devkit delta
- Delete stray Ti.UI.OptionBar copy.js
- Delete Ti.UI.iPhone.NavigationGroup.js (removed upstream)
- Fix broken require('../../../*') imports in Ti.UI.OptionBar.js
- Add docs/DEVKIT_DELTAS.md
- Ignore .DS_Store and references/ directory
- Add end-to-end smoke snapshot test over test-app fixture

Establishes a clean baseline for the v3 sync. Existing test
baseline: <N> tests passing across both packages (record from
Step 2 output).
EOF
)"
```

---

## Wave 1: Missing parser files

**Goal:** Add 10 parser files from upstream `31328743` that were missed in the earlier `2580792` sync.

**Files:**
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.ActivityIndicator.js`
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.Column.js`
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.MaskedImage.js`
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.Notification.js`
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.ProgressBar.js`
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.RefreshControl.js`
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.Row.js`
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.SearchBar.js`
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.Shortcut.js`
- Create: `packages/alloy-compiler/lib/parsers/Ti.UI.ShortcutItem.js`

### Steps

- [ ] **Step 1: Inspect upstream — confirm all 10 files are identical default pass-throughs**

```bash
for f in Ti.UI.ActivityIndicator Ti.UI.Column Ti.UI.MaskedImage Ti.UI.Notification Ti.UI.ProgressBar Ti.UI.RefreshControl Ti.UI.Row Ti.UI.SearchBar Ti.UI.Shortcut Ti.UI.ShortcutItem; do
  diff references/alloy/Alloy/commands/compile/parsers/$f.js references/alloy/Alloy/commands/compile/parsers/Ti.UI.ActivityIndicator.js && echo "$f IDENTICAL"
done
```

Expected: all 10 print "IDENTICAL" — confirms they share one body.

- [ ] **Step 2: Create all 10 parser files with the shared body**

Each file's content (identical across all 10):

```javascript
var CU = require('../compilerUtils');

exports.parse = function(node, state) {
	return require('./base').parse(node, state, parse);
};

function parse(node, state, args) {
	return require('./default').parse(node, state);
}
```

No import rewrites needed — these reference relative siblings (`./base`, `./default`, `../compilerUtils`) that already exist in `packages/alloy-compiler/lib/parsers/` and `packages/alloy-compiler/lib/`.

Create all 10 files at `packages/alloy-compiler/lib/parsers/` with the body above.

- [ ] **Step 3: Verify the new files load without errors**

```bash
node -e "
const files = ['Ti.UI.ActivityIndicator', 'Ti.UI.Column', 'Ti.UI.MaskedImage', 'Ti.UI.Notification', 'Ti.UI.ProgressBar', 'Ti.UI.RefreshControl', 'Ti.UI.Row', 'Ti.UI.SearchBar', 'Ti.UI.Shortcut', 'Ti.UI.ShortcutItem'];
for (const f of files) {
  const m = require('./packages/alloy-compiler/lib/parsers/' + f + '.js');
  if (typeof m.parse !== 'function') throw new Error(f + ' missing parse export');
}
console.log('OK');
"
```

Expected: prints `OK`.

- [ ] **Step 4: Run the full test suite**

```bash
pnpm -F alloy-compiler test
pnpm -F alloy-utils test
```

Expected: test counts match or exceed the pre-flight baseline. Smoke snapshot test unchanged.

- [ ] **Step 5: Commit Wave 1**

```bash
git add packages/alloy-compiler/lib/parsers/Ti.UI.ActivityIndicator.js \
        packages/alloy-compiler/lib/parsers/Ti.UI.Column.js \
        packages/alloy-compiler/lib/parsers/Ti.UI.MaskedImage.js \
        packages/alloy-compiler/lib/parsers/Ti.UI.Notification.js \
        packages/alloy-compiler/lib/parsers/Ti.UI.ProgressBar.js \
        packages/alloy-compiler/lib/parsers/Ti.UI.RefreshControl.js \
        packages/alloy-compiler/lib/parsers/Ti.UI.Row.js \
        packages/alloy-compiler/lib/parsers/Ti.UI.SearchBar.js \
        packages/alloy-compiler/lib/parsers/Ti.UI.Shortcut.js \
        packages/alloy-compiler/lib/parsers/Ti.UI.ShortcutItem.js

git commit -m "$(cat <<'EOF'
feat(compiler): port missing parser files from alloy v3

Adds 10 default-pass-through parsers that were missed in the
earlier partial sync (devkit 2580792). All 10 share one body:
a default pass-through via base+default parsers.

Upstream SHA: 31328743 (feat: add missing parser files)
EOF
)"
```

---

## Wave 2: Parser fixes

**Goal:** Apply parser-level bug fixes from upstream commits `4f86263c` (+ follow-ups), `ce5b4b13`, `819d1142`, `f9161306`.

**Files:**
- Modify: `packages/alloy-compiler/lib/parsers/Alloy.Abstract._ItemContainer.js`
- Modify: `packages/alloy-compiler/lib/parsers/Ti.UI.OptionDialog.js`
- Modify: `packages/alloy-compiler/lib/parsers/Alloy.Require.js` (if affected by `819d1142`)
- Verify: `packages/alloy-compiler/lib/parsers/Ti.UI.PickerColumn.js`

### Steps

- [ ] **Step 1: Inspect upstream `_ItemContainer.js` and identify the platform guard**

```bash
diff references/alloy/Alloy/commands/compile/parsers/Alloy.Abstract._ItemContainer.js packages/alloy-compiler/lib/parsers/Alloy.Abstract._ItemContainer.js
```

The critical hunk to port is the early-return inside the `_.each(children, ...)` loop:

```javascript
// validate the child element
if (!CU.isNodeForCurrentPlatform(child)) {
	return;
}
```

This guard sits after `var childArgs = CU.getParserArgs(child, state);` and before the translations `_.each`.

- [ ] **Step 2: Port the ItemContainer changes**

Open `packages/alloy-compiler/lib/parsers/Alloy.Abstract._ItemContainer.js`. The devkit version differs from upstream in cosmetics (arrow functions, spacing) and in missing the platform guard.

Strategy: replace the devkit file's body with the upstream body, applying the import rewrite (`require('../../../utils')` → `require('alloy-utils').utils`, `require('../../../logger')` → `require('alloy-utils').logger`). Keep the devkit-style cosmetic preferences only where they don't conflict — prefer the upstream shape since this is a sync.

Read upstream:

```bash
cat references/alloy/Alloy/commands/compile/parsers/Alloy.Abstract._ItemContainer.js
```

Write the file with that body, applying the import rewrite at the top:

```javascript
var _ = require('lodash'),
	U = require('alloy-utils').utils,
	CU = require('../compilerUtils'),
	styler = require('../styler'),
	logger = require('alloy-utils').logger;
```

The rest of the file mirrors upstream verbatim.

- [ ] **Step 3: Inspect upstream `Ti.UI.OptionDialog.js` for the cancel fix**

```bash
git -C references/alloy show ce5b4b13 -- Alloy/commands/compile/parsers/Ti.UI.OptionDialog.js
```

- [ ] **Step 4: Port the OptionDialog cancel-option fix**

Apply the diff from Step 3 to `packages/alloy-compiler/lib/parsers/Ti.UI.OptionDialog.js`. Apply import rewrites if any new `require('../../../...')` paths appear in the diff.

- [ ] **Step 5: Inspect `819d1142` — missing includes fix**

```bash
git -C references/alloy show 819d1142 --stat
git -C references/alloy show 819d1142
```

This commit may touch `Alloy.Require.js` or another include-resolution file. Identify the affected file from the stat output, then port the diff with import rewrites.

- [ ] **Step 6: Verify PickerColumn parity with `f9161306`**

```bash
diff references/alloy/Alloy/commands/compile/parsers/Ti.UI.PickerColumn.js packages/alloy-compiler/lib/parsers/Ti.UI.PickerColumn.js
```

If the diff is empty (after accounting for import-rewrite differences), this is a no-op. If non-empty, port the upstream version with import rewrites.

- [ ] **Step 7: Run tests**

```bash
pnpm -F alloy-compiler test
```

Expected: test count ≥ baseline. Smoke snapshot unchanged (these fixes affect platform/cancel/include behavior, not the test-app fixture's golden path).

If the ItemContainer change causes existing snapshot tests to update, review the diff: it should be limited to cases where a child node has `platform=` attribute filtering. Commit snapshot updates alongside the source change.

- [ ] **Step 8: Commit Wave 2**

```bash
git add packages/alloy-compiler/lib/parsers/
git commit -m "$(cat <<'EOF'
fix(compiler): port parser fixes from alloy v3

- Alloy.Abstract._ItemContainer: restore isNodeForCurrentPlatform
  guard so platform-filtered children are skipped correctly.
- Ti.UI.OptionDialog: cancel-option emit fix.
- Alloy.Require (or affected file): missing-includes fix.
- Ti.UI.PickerColumn: parity check with upstream.

Upstream SHAs:
- 4f86263c, 6d4b36a9, 850e8990, 7c038dfd (ItemContainer platform fix)
- ce5b4b13 (OptionDialog cancel)
- 819d1142 (missing includes)
- f9161306 (PickerColumn no-getter)
EOF
)"
```

---

## Wave 3: Controller / AST emit

**Goal:** Port upstream changes to controller emission and AST manipulation. This is the highest-risk wave — generated controller shape changes will trip snapshot tests.

**Files:**
- Modify: `packages/alloy-compiler/lib/ast/controller.js`
- Modify: `packages/alloy-compiler/lib/compilers/*.js` (whichever owns controller emission — identify in Step 1)
- Possibly modify: `packages/alloy-compiler/lib/parsers/Alloy.Abstract.Option.js` (re-verify devkit delta)
- Snapshot files updated as side effects

### Steps

- [ ] **Step 1: Inspect each upstream commit's diff**

```bash
for sha in d4444bc0 02063e8b ffdcd3b6 795685c3 296376cd fe846c09 9ca4cd6e 8c7abb5e a4591fef 5cf47147 e45d9300 f5cbdd5e; do
  echo "=== $sha ==="
  git -C references/alloy show $sha --stat
done
```

Note which files each touches. Most should land in `Alloy/commands/compile/ast/controller.js`.

- [ ] **Step 2: Port `ast/controller.js` changes**

```bash
diff references/alloy/Alloy/commands/compile/ast/controller.js packages/alloy-compiler/lib/ast/controller.js
```

The diff captures the cumulative effect of all 6 controller-shape commits (`d4444bc0`, `02063e8b`, `ffdcd3b6`, `795685c3`, `296376cd`, `fe846c09`). Port the upstream version verbatim, applying the import-rewrite rule for any `require('../../../...')` paths that appear.

- [ ] **Step 3: Port newline-trimming logic (`9ca4cd6e`, `8c7abb5e`, `a4591fef`)**

```bash
git -C references/alloy show 9ca4cd6e --stat
git -C references/alloy show 8c7abb5e --stat
git -C references/alloy show a4591fef --stat
```

Identify the file owning the trim logic (likely `ast/controller.js` or a compile step). Port the changes; ensure trimming is gated on `deploytype === 'production'` per `8c7abb5e`.

- [ ] **Step 4: Port models-length fix (`5cf47147`)**

```bash
git -C references/alloy show 5cf47147
```

Apply the diff to whichever file it touches; apply import rewrites.

- [ ] **Step 5: Port BaseController error reporting (`e45d9300`, `f5cbdd5e`)**

```bash
git -C references/alloy show e45d9300
git -C references/alloy show f5cbdd5e
```

These likely touch `Alloy/lib/alloy/controllers/BaseController.js` upstream. In devkit, the BaseController runtime lives in `packages/alloy-compiler/lib/runtime/` or `packages/alloy-compiler/template/` — locate via:

```bash
grep -rn "BaseController" packages/alloy-compiler/ | head -5
```

Port the diffs to the corresponding devkit file.

- [ ] **Step 6: Re-verify the `Alloy.Abstract.Option.js` const patch**

```bash
git diff HEAD~3 -- packages/alloy-compiler/lib/parsers/Alloy.Abstract.Option.js
diff references/alloy/Alloy/commands/compile/parsers/Alloy.Abstract.Option.js packages/alloy-compiler/lib/parsers/Alloy.Abstract.Option.js
```

If upstream's emit shape changed in a way that affects the `const`-patch context, update the patch to apply against the new shape and update `docs/DEVKIT_DELTAS.md` item 3 to describe the rebased patch.

- [ ] **Step 7: Run tests with snapshot review**

```bash
pnpm -F alloy-compiler test 2>&1 | tail -40
```

Expected: snapshots fail. Inspect the diffs:

```bash
pnpm -F alloy-compiler test 2>&1 | grep -A 30 "snapshot" | head -100
```

Verify each snapshot diff is consistent with one of:
- Removed empty lines in controller body (from `9ca4cd6e`).
- Removed leading/trailing newlines in production-mode output (from `8c7abb5e`).
- Else-case handling in optional chaining (from `02063e8b` / `d4444bc0`).
- Reorganized models-length logic (from `5cf47147`).

If any diff is unexplained, stop and investigate before regenerating.

- [ ] **Step 8: Update snapshots**

```bash
pnpm -F alloy-compiler test -- -u
```

This rewrites inline `toMatchInlineSnapshot(...)` calls in `.spec.js` files and the external `__snapshots__/smoke.spec.js.snap`. Inspect the resulting `.spec.js` diffs to confirm they match the explanations from Step 7.

- [ ] **Step 9: Run tests one more time to confirm clean state**

```bash
pnpm -F alloy-compiler test
pnpm -F alloy-utils test
```

Expected: all pass, test count ≥ baseline.

- [ ] **Step 10: Commit Wave 3**

```bash
git add packages/alloy-compiler/lib/ \
        packages/alloy-compiler/template/ \
        packages/alloy-compiler/test/
git commit -m "$(cat <<'EOF'
feat(compiler): port controller and AST emit changes from alloy v3

BREAKING CHANGE: Generated controller code shape changes.
Consumers will see whitespace and structural differences in
the compiled output of every component.

- ast/controller.js: else-case handling, optional chaining
- Reduce empty lines in emitted controllers
- Production-only newline trimming for ES6 modules
- Models length fix
- BaseController error reporting + no-proxy guard

Snapshot tests updated in lockstep.

Upstream SHAs:
- d4444bc0, 02063e8b, ffdcd3b6, 795685c3, 296376cd, fe846c09 (controller.js)
- 9ca4cd6e (reduce empty lines)
- 8c7abb5e, a4591fef (trim ES6 mods)
- 5cf47147 (models length)
- e45d9300, f5cbdd5e (BaseController error reporting)
EOF
)"
```

---

## Wave 4: Compile / sourcemap

**Goal:** Port sourcemap and babel-transform improvements.

**Files:**
- Modify: `packages/alloy-compiler/lib/sourceMapper.js`
- Modify: `packages/alloy-compiler/lib/compilers/widget.js` (or wherever widget sourcemaps are emitted — identify in Step 1)
- Modify: babel-transform call site (locate in Step 4)

### Steps

- [ ] **Step 1: Inspect each commit and identify devkit target files**

```bash
git -C references/alloy show 537107de --stat
git -C references/alloy show b1259b1f --stat
git -C references/alloy show ba8d4c22 --stat
git -C references/alloy show ba0068ed --stat
```

Map upstream file paths to devkit destinations using the path table at the top of this plan.

- [ ] **Step 2: Port `path.join` fix in `sourceMapper.js` (`537107de`)**

```bash
git -C references/alloy show 537107de
```

Locate the manually-constructed path string in `packages/alloy-compiler/lib/sourceMapper.js` and replace with `path.join(...)` matching the upstream change.

- [ ] **Step 3: Port widget-sourcemap guards (`b1259b1f`, `ba8d4c22`)**

```bash
git -C references/alloy show b1259b1f
git -C references/alloy show ba8d4c22
```

In the devkit widget compiler (identify via `grep -rn "widget" packages/alloy-compiler/lib/compilers/`):
- Add the "skip sourcemap when disabled" guard from `b1259b1f`.
- Add sourcemap generation for widget lib files from `ba8d4c22`.

- [ ] **Step 4: Port babel filename argument (`ba0068ed`)**

```bash
git -C references/alloy show ba0068ed
grep -rn "babel.transform\|babel.transformSync\|@babel/core" packages/alloy-compiler/lib/ | head -5
```

At each babel call site identified, ensure the options object includes `filename: <absolute path of source>`. Apply the same shape as upstream's change.

- [ ] **Step 5: Run tests**

```bash
pnpm -F alloy-compiler test
```

Expected: test count ≥ baseline. The smoke snapshot may pick up filename in sourcemap output — review and update if so.

- [ ] **Step 6: Commit Wave 4**

```bash
git add packages/alloy-compiler/lib/ packages/alloy-compiler/test/
git commit -m "$(cat <<'EOF'
fix(compiler): port sourcemap and babel-transform fixes from alloy v3

BREAKING CHANGE: babel transform now receives a filename argument,
enabling .babelrc / babel.config.js discovery for downstream
Alloy projects. Projects that happen to have one in scope will see
their build behavior change.

- sourceMapper: use path.join instead of manual string concat
- Widget compiler: skip sourcemaps when disabled
- Widget compiler: generate sourcemaps for widget lib files
- Babel transform: pass filename to enable config discovery

Upstream SHAs:
- 537107de (sourceMapper path.join)
- b1259b1f (skip widget sourcemaps when disabled)
- ba8d4c22 (widget lib sourcemaps)
- ba0068ed (babel filename arg)
EOF
)"
```

---

## Wave 5: Builtins / runtime / lang

**Goal:** Update vendored Backbone, underscore, lang files, Alloy defaults.

**Files:**
- Replace: `packages/alloy-compiler/builtins/backbone.js`
- Replace: `packages/alloy-compiler/builtins/underscore.js` (if vendored under this name — verify)
- Modify: `packages/alloy-utils/lib/constants.js`
- Possibly modify: `packages/alloy-compiler/lib/compilers/*.js` (backbone-version hooks)
- Replace / add: language files under `packages/alloy-compiler/builtins/` or `packages/alloy-utils/`
- Modify: any Alloy-defaults file (locate in Step 4)

### Steps

- [ ] **Step 1: Inspect upstream and locate devkit equivalents**

```bash
git -C references/alloy show 30d9f88c --stat
git -C references/alloy show d91b4364 --stat
git -C references/alloy show 9f273a67 --stat
git -C references/alloy show fb845f73 --stat
git -C references/alloy show 694070b5 --stat
git -C references/alloy show 36b2fc87 --stat
git -C references/alloy show 98bb1c47 --stat
git -C references/alloy show 29a8a54c --stat
git -C references/alloy show 88db7d96 --stat
```

For each upstream file, find the devkit destination. `Alloy/builtins/` → `packages/alloy-compiler/builtins/`.

- [ ] **Step 2: Replace `backbone.js` (Backbone 1.6.0)**

```bash
cp references/alloy/Alloy/builtins/backbone.js packages/alloy-compiler/builtins/backbone.js
```

Then port `d91b4364` (the bugfix commits on top of the base 1.6.0 drop):

```bash
git -C references/alloy show d91b4364
```

Apply any post-1.6.0 patches to the copied file.

- [ ] **Step 3: Port Backbone hooks (`9f273a67`)**

```bash
git -C references/alloy show 9f273a67
```

This commit likely touches compile-side files that detect and inject the Backbone version. Identify each touched file and port with import rewrites. If hooks span both `alloy-compiler` and `alloy-utils`, edit both in this same wave commit (atomicity is intentional per spec risk #1).

- [ ] **Step 4: Update default Backbone version (`fb845f73`, `694070b5`)**

```bash
git -C references/alloy show fb845f73
git -C references/alloy show 694070b5
```

Edit `packages/alloy-utils/lib/constants.js` to match the new default Backbone version constant. If upstream's `Alloy/common/constants.js` introduces new keys, port them.

- [ ] **Step 5: Update underscore (`36b2fc87`)**

```bash
git -C references/alloy show 36b2fc87 --stat
```

Find the devkit-vendored underscore file (likely `packages/alloy-compiler/builtins/underscore.js` or similar):

```bash
find packages/alloy-compiler/builtins -iname "underscore*"
```

Replace with the upstream version:

```bash
cp references/alloy/Alloy/builtins/underscore.js packages/alloy-compiler/builtins/underscore.js
```

(Adjust path if devkit uses a different filename.)

- [ ] **Step 6: Update lang files (`98bb1c47`)**

```bash
git -C references/alloy show 98bb1c47 --stat | head -20
```

For each touched lang file, copy upstream → devkit:

```bash
# Example pattern — adapt to actual filenames from the stat output:
cp references/alloy/Alloy/<path>/<file>.js packages/alloy-compiler/<corresponding-path>/<file>.js
```

- [ ] **Step 7: Update Alloy defaults (`29a8a54c`)**

```bash
git -C references/alloy show 29a8a54c
```

Apply the diff to the corresponding devkit defaults file.

- [ ] **Step 8: Verify jsonlint parity (`88db7d96`)**

```bash
git -C references/alloy show 88db7d96 --stat
grep -n "jsonlint" packages/alloy-compiler/package.json
```

Devkit already on `@prantlf/jsonlint` ^16. If upstream moved to a different package or major version, align. Likely no-op.

- [ ] **Step 9: Run tests**

```bash
pnpm -F alloy-compiler test
pnpm -F alloy-utils test
```

Expected: test count ≥ baseline. The smoke snapshot may pick up Backbone/lang/defaults differences if the fixture exercises them — review and update.

- [ ] **Step 10: Commit Wave 5**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(compiler): update vendored runtime and lang from alloy v3

BREAKING CHANGE: Backbone 1.6.0, underscore 1.13.6, updated
Alloy defaults and lang files. Downstream apps depending on
specific default strings or pre-1.6 Backbone behavior may need
to adapt.

- Vendor Backbone 1.6.0 with upstream bugfixes
- Vendor underscore 1.13.6
- Update default Backbone version constant
- Update Alloy defaults
- Update Alloy lang files
- jsonlint parity verified

Upstream SHAs:
- 30d9f88c, d91b4364, 9f273a67 (Backbone 1.6.0)
- fb845f73, 694070b5 (default backbone version)
- 36b2fc87 (underscore 1.13.6)
- 98bb1c47 (lang files)
- 29a8a54c (Alloy defaults)
- 88db7d96 (jsonlint)
EOF
)"
```

---

## Wave 6: Dependencies / housekeeping

**Goal:** Remove `chmodr`, bump engines and dep ranges, set v1.0.0 versions.

**Files:**
- Modify: `packages/alloy-compiler/package.json`
- Modify: `packages/alloy-utils/package.json`
- Modify: `package.json` (root)
- Modify: `lerna.json` (if it tracks versions)
- Possibly modify: `.js` files that import `chmodr`

### Steps

- [ ] **Step 1: Locate and remove `chmodr` usage**

```bash
grep -rn "chmodr" packages/ --include="*.js"
```

For each call site, port upstream's removal (`244a935e`):

```bash
git -C references/alloy show 244a935e
```

Replace `chmodr` calls with the upstream replacement (typically just deletion of recursive-chmod calls — they were used for files that don't need executable bits in a library context).

If grep finds devkit-only call sites not present in upstream, retain `chmodr` and skip this step's dep removal in Step 2. Document the retention in `docs/DEVKIT_DELTAS.md`.

- [ ] **Step 2: Remove `chmodr` from `packages/alloy-compiler/package.json` dependencies**

Edit `packages/alloy-compiler/package.json` and delete the `"chmodr": "^1.2.0",` line from `dependencies`.

(Skip if Step 1 retained devkit-only usage.)

- [ ] **Step 3: Bump engines.node to >=20.18.1 in both packages**

In `packages/alloy-compiler/package.json` and `packages/alloy-utils/package.json`, change:

```json
"engines": {
    "node": ">=10.0.0"
}
```

to:

```json
"engines": {
    "node": ">=20.18.1"
}
```

In the root `package.json`, add or update the same `engines.node` block.

- [ ] **Step 4: Bump dep ranges to match upstream v3**

Read upstream's `package.json`:

```bash
cat references/alloy/package.json | head -60
```

For each shared dep in `packages/alloy-compiler/package.json`, align the version range to upstream's. Likely changes: `@babel/*` to `^7.20+` or `^7.22+`, `lodash`, `source-map`. Leave `alloy-utils` alone (handled in Step 5).

For `packages/alloy-utils/package.json`, apply the same alignment for its deps.

- [ ] **Step 5: Bump package versions to 1.0.0**

In `packages/alloy-compiler/package.json`:
- Change `"version": "0.2.7"` → `"version": "1.0.0"`.
- Change `"alloy-utils": "^0.2.7"` → `"alloy-utils": "^1.0.0"`.

In `packages/alloy-utils/package.json`:
- Change `"version": "0.2.7"` → `"version": "1.0.0"`.

In `lerna.json`:

```bash
cat lerna.json
```

If `version` is set to `"0.2.7"` or `"independent"`, leave as-is or update to `"1.0.0"` per existing convention.

- [ ] **Step 6: Reinstall and apply final cleanup pass (`052b80b8`)**

```bash
pnpm install
git -C references/alloy show 052b80b8 --stat
```

Apply any of `052b80b8`'s changes that fall in mirrored devkit paths. Most of `052b80b8` is upstream-only; expect few or zero hunks to port.

- [ ] **Step 7: Run tests**

```bash
pnpm -F alloy-compiler test
pnpm -F alloy-utils test
```

Expected: test count ≥ baseline. No snapshot changes expected.

- [ ] **Step 8: Commit Wave 6**

```bash
git add packages/alloy-compiler/package.json \
        packages/alloy-utils/package.json \
        package.json \
        lerna.json \
        pnpm-lock.yaml
git add packages/alloy-compiler/lib/  # if chmodr removal touched source
git commit -m "$(cat <<'EOF'
chore: bump deps, engines, and versions for v3 alignment

BREAKING CHANGE: engines.node bumped to >=20.18.1. chmodr
dependency removed from public API.

- Remove chmodr dependency (upstream removed in 244a935e)
- engines.node >=20.18.1 in both packages and root
- Align @babel/* and other shared deps with upstream v3 ranges
- alloy-compiler 0.2.7 -> 1.0.0
- alloy-utils 0.2.7 -> 1.0.0
- alloy-compiler depends on alloy-utils ^1.0.0
- Final cleanup pass from upstream 052b80b8

Upstream SHAs:
- 244a935e (remove chmodr)
- ab6e6de5 (node version bump)
- 052b80b8 (cleanup)
EOF
)"
```

---

## Wave 7: Attribution rebrand

**Goal:** Update devkit's own attribution from Appcelerator/Axway to TiDev, matching upstream's rebrand.

**Files:**
- Modify: `packages/alloy-compiler/package.json`
- Modify: `packages/alloy-utils/package.json`
- Modify: `LICENSE`
- Modify: `README.md`

### Steps

- [ ] **Step 1: Confirm current canonical repository**

```bash
git remote -v
```

Note the current `origin` URL. If it still points at `appcelerator/alloy-devkit`, decide whether to leave it or update — the rebrand is about attribution, not necessarily repo hosting. Defer changing `repository.url` unless the repo has actually moved.

- [ ] **Step 2: Update `author` in both package.json files**

In `packages/alloy-compiler/package.json` and `packages/alloy-utils/package.json`, change:

```json
"author": "Axway Appcelerator",
```

to:

```json
"author": "TiDev, Inc. <npm@tidev.io>",
```

(Matches upstream `references/alloy/package.json` format.)

- [ ] **Step 3: Update LICENSE**

```bash
cat LICENSE | head -10
```

Replace the copyright holder line (typically "Copyright (c) <year> Appcelerator, Inc." or "Axway, Inc.") with:

```
Copyright (c) 2014-2026 TiDev, Inc.
```

(Year range mirrors upstream's `references/alloy/LICENSE`.)

- [ ] **Step 4: Update README.md references**

```bash
grep -n "Appcelerator\|Axway" README.md
```

For each match, decide: if the reference is to project ownership ("maintained by Appcelerator"), update to TiDev. If it's historical context ("this is a mirror of Alloy's compile command"), leave as-is.

- [ ] **Step 5: Run tests**

```bash
pnpm -F alloy-compiler test
pnpm -F alloy-utils test
```

Expected: test count ≥ baseline. No code changed; this should be a no-op.

- [ ] **Step 6: Commit Wave 7**

```bash
git add LICENSE README.md packages/alloy-compiler/package.json packages/alloy-utils/package.json
git commit -m "$(cat <<'EOF'
chore: rebrand attribution to TiDev

Aligns devkit's own metadata with upstream Alloy's transition
from Appcelerator/Axway to TiDev, Inc. ownership.

- package.json author -> TiDev, Inc.
- LICENSE copyright holder -> TiDev, Inc. (2014-2026)
- README.md ownership references -> TiDev

repository.url left unchanged (devkit repo has not moved).
EOF
)"
```

---

## Deferred test commit: parser tests

**Goal:** Add unit tests for the 10 parsers ported in Wave 1.

**Files:**
- Create: `packages/alloy-compiler/test/unit/parsers.spec.js`
- Possibly create: fixture XML files under `packages/alloy-compiler/test/unit/fixtures/test-app/app/views/`

### Steps

- [ ] **Step 1: Inspect an existing parser test pattern**

```bash
ls packages/alloy-compiler/test/unit/
cat packages/alloy-compiler/test/unit/view.spec.js | head -40
```

Note the pattern: load a view fixture, compile, snapshot. The 10 new parsers all default-pass-through to `./default`, so the test reduces to "compile a view that uses this tag and confirm it doesn't crash."

- [ ] **Step 2: Add fixture views (if needed)**

If the existing `test-app/app/views/index.xml` doesn't reference all 10 new tags, create a minimal `wave1-parsers.xml` view under `packages/alloy-compiler/test/unit/fixtures/test-app/app/views/` that uses each new tag once:

```xml
<Alloy>
  <Window>
    <ActivityIndicator />
    <Column />
    <MaskedImage />
    <Notification />
    <ProgressBar />
    <RefreshControl />
    <Row />
    <SearchBar />
    <Shortcut>
      <ShortcutItem />
    </Shortcut>
  </Window>
</Alloy>
```

(Validate against upstream usage — some tags may require specific parent contexts.)

- [ ] **Step 3: Write the parser test**

Create `packages/alloy-compiler/test/unit/parsers.spec.js`:

```javascript
const { setupCompilerFactory, resolveComponentPath } = require('./utils');

const factory = setupCompilerFactory();

describe('wave 1 parsers', () => {
	const tags = [
		'ActivityIndicator',
		'Column',
		'MaskedImage',
		'Notification',
		'ProgressBar',
		'RefreshControl',
		'Row',
		'SearchBar',
		'Shortcut',
		'ShortcutItem'
	];

	it('compiles a view using all wave-1 tags without error', () => {
		expect.assertions(1);
		const compiler = factory.createCompiler('view');
		const result = compiler.compile({
			file: resolveComponentPath('views', 'wave1-parsers.xml')
		});
		expect(result.viewCode).toMatchSnapshot('wave1-parsers');
	});

	for (const tag of tags) {
		it(`registers parser for Ti.UI.${tag}`, () => {
			expect.assertions(1);
			const parser = require(`../../lib/parsers/Ti.UI.${tag}`);
			expect(typeof parser.parse).toBe('function');
		});
	}
});
```

- [ ] **Step 4: Run the test to generate the snapshot**

```bash
pnpm -F alloy-compiler test -- parsers.spec.js
```

Expected: first run writes `__snapshots__/parsers.spec.js.snap`. Inspect the snapshot for sanity — should contain `Ti.UI.create<Tag>` calls for each new tag.

- [ ] **Step 5: Re-run to confirm idempotence**

```bash
pnpm -F alloy-compiler test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/alloy-compiler/test/
git commit -m "$(cat <<'EOF'
test(compiler): add parser tests for wave 1 ports

Adds a smoke test that exercises all 10 newly-ported parsers
(Ti.UI.ActivityIndicator, Column, MaskedImage, Notification,
ProgressBar, RefreshControl, Row, SearchBar, Shortcut,
ShortcutItem) plus parser-registration assertions.
EOF
)"
```

---

## Changelog entry

**Files:**
- Modify: `CHANGELOG.md`

### Steps

- [ ] **Step 1: Inspect existing changelog format**

```bash
head -40 CHANGELOG.md
```

Note the format used (Conventional Commits sections, version heading style).

- [ ] **Step 2: Add a v1.0.0 entry at the top**

Insert after the header, before existing entries:

```markdown
# 1.0.0 (2026-05-12)

### BREAKING CHANGES

* **node:** Minimum Node.js version is now 20.18.1 (was 10.0.0).
* **compiler:** Generated controller code shape changed (whitespace, ES6 module trimming, else-case handling). Consumers will see diffs in compiled output of every component.
* **compiler:** `chmodr` removed from public dependencies.
* **compiler:** Babel transform now passes `filename`, enabling `.babelrc` / `babel.config.js` discovery in downstream Alloy projects.
* **runtime:** Backbone bumped to 1.6.0 (major API surface change for Models/Collections).
* **runtime:** Underscore bumped to 1.13.6.
* **runtime:** Updated Alloy defaults and lang files — downstream apps depending on specific default strings may need to adapt.

### Features

* Sync with upstream Alloy v3.0.0 across compile/parsers/AST/templates/builtins.
* Add 10 missing parser pass-throughs: `ActivityIndicator`, `Column`, `MaskedImage`, `Notification`, `ProgressBar`, `RefreshControl`, `Row`, `SearchBar`, `Shortcut`, `ShortcutItem`.
* Generate sourcemaps for widget lib files.

### Bug Fixes

* Restore `isNodeForCurrentPlatform` guard in `Alloy.Abstract._ItemContainer`.
* Fix `OptionDialog` cancel-option emission.
* Fix missing-includes handling.
* Use `path.join` in sourceMapper.
* Skip widget sourcemaps when sourcemaps are disabled.
* Fix broken `require('../../../tiapp')` import in `Ti.UI.OptionBar` parser (devkit-local).

### Chores

* Rebrand attribution to TiDev, Inc.
* Delete stray `Ti.UI.OptionBar copy.js` and removed-upstream `Ti.UI.iPhone.NavigationGroup.js` parsers.
* Document devkit deltas in `docs/DEVKIT_DELTAS.md`.
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add v1.0.0 changelog entry for alloy v3 sync"
```

---

## Final: PR preparation

### Steps

- [ ] **Step 1: Verify the full sync passes tests one more time**

```bash
pnpm install
pnpm -F alloy-compiler test
pnpm -F alloy-utils test
```

Both must pass with counts ≥ baseline.

- [ ] **Step 2: Push branch**

```bash
git push -u origin chore/sync-alloy-v3
```

- [ ] **Step 3: Open the PR (do not merge — leave for user)**

```bash
gh pr create --title "feat!: sync with alloy v3.0.0" --body "$(cat <<'EOF'
## Summary

Brings `alloy-devkit` from its 1.15.2 baseline (with partial cherry-picks) up to Alloy v3.0.0. Hand-ported across 7 waves, one commit per wave, tests pass at every wave.

See `docs/superpowers/specs/2026-05-12-alloy-v3-sync-design.md` for the full spec and `docs/superpowers/plans/2026-05-12-alloy-v3-sync.md` for the wave-by-wave execution log.

## Breaking changes

- **Node.js** minimum is now `>=20.18.1` (was `>=10.0.0`).
- **Generated controller shape** changed (whitespace, ES6-module trimming, else-case handling, models-length fix). Every downstream component's compiled output will differ.
- **Backbone 1.6.0** vendored — Models/Collections API surface change.
- **Underscore 1.13.6** vendored.
- **Babel filename arg** now passed during transform — downstream projects with a `.babelrc` or `babel.config.js` in scope will see those configs picked up where they previously were not.
- **`chmodr`** removed from `alloy-compiler` dependencies.
- **Alloy lang files and defaults** updated — apps depending on specific strings may need to adapt.
- **Versions:** `alloy-compiler` and `alloy-utils` both bump from `0.2.7` → `1.0.0`. `alloy-compiler`'s dep on `alloy-utils` is now `^1.0.0`.

## Test plan

- [ ] CI green on `chore/sync-alloy-v3`.
- [ ] Manual smoke: clone a representative Alloy app, build against this branch's `alloy-compiler` linked locally, confirm the build succeeds and the app starts.
- [ ] Diff generated output against current `develop` on the same app to confirm only the documented breaking changes show up.
- [ ] Review snapshot diffs in `packages/alloy-compiler/test/unit/__snapshots__/` against the wave 3 / wave 5 changelog entries.

Publish (`lerna publish`) is intentionally NOT part of this PR — bump versions are committed, publishing is a separate post-merge step.
EOF
)"
```

- [ ] **Step 4: Report back**

Print the PR URL and the final test counts. Done.

---

## Self-review checklist (for the implementer to skim before starting)

- [ ] Spec at `docs/superpowers/specs/2026-05-12-alloy-v3-sync-design.md` is approved and current.
- [ ] `references/alloy/` is checked out at the v3.0.0 tag (`git -C references/alloy describe --tags`).
- [ ] You are on a clean working tree before starting pre-flight.
- [ ] You understand the import-rewrite rule (DEVKIT_DELTAS.md item 1) and will apply it mechanically to every file you port.
- [ ] You will commit only when tests pass at or above the baseline recorded in pre-flight Step 2.
- [ ] You will NOT publish to npm; that's a separate post-merge step.
