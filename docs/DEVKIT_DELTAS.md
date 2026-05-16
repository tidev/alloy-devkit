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
