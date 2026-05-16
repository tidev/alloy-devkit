# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 1.0.0-beta.0 (2026-05-12)

Sync with upstream [Alloy v3.0.0](https://github.com/tidev/alloy/tree/3.0.0). Both `alloy-compiler` and `alloy-utils` jump from `0.2.7` to `1.0.0-beta.0` as the pre-release line for the v3 alignment.

### BREAKING CHANGES

* **node:** Minimum Node.js version is now `20.18.1` (was `10.0.0`).
* **compiler:** Generated controller code shape changed in production builds (`retainLines: false`, ES6 module trimming, collection-binding null-safety). Compiled output of every component will differ from previous versions.
* **compiler:** Babel transform now receives a `filename` argument, enabling `.babelrc` / `babel.config.js` discovery in downstream Alloy projects. Projects with one in scope will see their build behavior change.
* **runtime:** Default Backbone version constant bumped to `1.6.0` (`SUPPORTED_BACKBONE_VERSIONS` updated in `alloy-utils`).
* **runtime:** Vendored `moment` updated to 2.30.x; lang catalog expanded to 137 files (matches upstream).
* **deps:** `chmodr` dependency removed; `lodash`, `@babel/*`, `fs-extra`, `source-map`, `moment`, `resolve`, `node.extend` version ranges bumped to match upstream v3.
* **deps:** Legacy `jsonlint` and `xmldom` dependencies dropped from `alloy-utils` in favor of `@prantlf/jsonlint` and `@xmldom/xmldom`.

### Features

* Sync with Alloy v3.0.0 across `compile/parsers`, `compile/ast`, `compile/sourceMapper`, `compile/compilerUtils`, `compilers/component`, `builtins`, and `common/constants`.
* Add 10 missing parser pass-throughs from upstream `31328743`: `Ti.UI.ActivityIndicator`, `Column`, `MaskedImage`, `Notification`, `ProgressBar`, `RefreshControl`, `Row`, `SearchBar`, `Shortcut`, `ShortcutItem`. Includes regression tests.
* Generate source maps for widget library files (`ba8d4c22`).
* Add end-to-end smoke snapshot test (`smoke.spec.js`) covering the `test-app` fixture component compile.

### Bug Fixes

* Restore `isNodeForCurrentPlatform` guard in `Alloy.Abstract._ItemContainer` so platform-filtered children are skipped correctly (`4f86263c`).
* Use `path.join` in `sourceMapper.js` instead of manual string concat (`537107de`).
* Skip widget sourcemap emission when sourcemaps are disabled (`b1259b1f`).
* Fix broken `require('../../../tiapp')` import in `Ti.UI.OptionBar` parser (devkit-local pre-existing latent bug, surfaced during sync prep).
* `Alloy.Abstract.Option.js` emits `const` declarations to avoid implicit-global assignment under strict mode (devkit delta on top of `93c2df14`; supersedes upstream `ce5b4b13`).

### Chores

* Rebrand attribution to TiDev, Inc. (`LICENSE` copyright, `package.json` author fields, repo URLs).
* Delete stray `Ti.UI.OptionBar copy.js` parser file (accidental copy in tree).
* Delete `Ti.UI.iPhone.NavigationGroup.js` parser (removed upstream prior to v3).
* Document devkit-local divergences from upstream in `docs/DEVKIT_DELTAS.md`.
* Ignore `.DS_Store` files and local `references/` directory.

### Out-of-scope upstream commits

For traceability, the following upstream commits since 1.15.2 were intentionally NOT ported because they touch files outside devkit's mirrored surface (CLI commands, app templates, runtime BaseController shipped with Titanium SDK, etc.): `e45d9300`, `f5cbdd5e`, `30d9f88c`, `9f273a67`, `fb845f73`, `36b2fc87`, `29a8a54c`, `86791bc5`. See commit messages on the sync branch for per-SHA justification.

## [0.2.7](https://github.com/appcelerator/alloy-devkit/compare/v0.2.6...v0.2.7) (2021-06-02)


### Bug Fixes

* strip platfrom prefix from component dirname ([4d065e7](https://github.com/appcelerator/alloy-devkit/commit/4d065e7a60815119aeff572f70ad063b2bf5d413))
* **compiler:** allow tabgroup as a child of navigationwindow ([#222](https://github.com/appcelerator/alloy-devkit/issues/222)) ([fbe453c](https://github.com/appcelerator/alloy-devkit/commit/fbe453ce48849ab2ec2a32bf06221dcce0f01c41))
* improve check around whether widget is only node in the view ([#194](https://github.com/appcelerator/alloy-devkit/issues/194)) ([d32c819](https://github.com/appcelerator/alloy-devkit/commit/d32c81913c155d0fd6953bdf717d4cd28581e57b))





## [0.2.6](https://github.com/appcelerator/alloy-devkit/compare/v0.2.5...v0.2.6) (2020-11-05)


### Bug Fixes

* widget controller assigned wrong widget id ([050178d](https://github.com/appcelerator/alloy-devkit/commit/050178d993abf599b20fd9717b0004752fb3494e))





## [0.2.5](https://github.com/appcelerator/alloy-devkit/compare/v0.2.4...v0.2.5) (2020-11-03)


### Bug Fixes

* use default export for es6 base controller ([1f307fc](https://github.com/appcelerator/alloy-devkit/commit/1f307fc80316690bcf505da45973eff7048043d9))





## [0.2.4](https://github.com/appcelerator/alloy-devkit/compare/v0.2.3...v0.2.4) (2020-08-04)


### Bug Fixes

* add missing methods to purge style cache ([0c44683](https://github.com/appcelerator/alloy-devkit/commit/0c446833f7fc4936e5530f10a6e5d2219c8f996b))





## [0.2.3](https://github.com/appcelerator/alloy-devkit/compare/v0.2.2...v0.2.3) (2020-06-08)


### Bug Fixes

* add missing direct dependencies ([56e44ab](https://github.com/appcelerator/alloy-devkit/commit/56e44ab314d7500ead0591f74d54300251751e4b))





## [0.2.2](https://github.com/appcelerator/alloy-devkit/compare/v0.2.1...v0.2.2) (2020-05-18)


### Bug Fixes

* **compiler:** correct looping of style keys ([#61](https://github.com/appcelerator/alloy-devkit/issues/61)) ([e76394b](https://github.com/appcelerator/alloy-devkit/commit/e76394b70152b0e3dd8c6678d84d26c08b04b420))





## [0.2.1](https://github.com/appcelerator/alloy-devkit/compare/v0.2.0...v0.2.1) (2020-03-04)


### Bug Fixes

* **compiler:** remove unused babel plugin ([047575b](https://github.com/appcelerator/alloy-devkit/commit/047575b72ecaf15ca7b73cd19cd756d8caf14fb9))





# [0.2.0](https://github.com/appcelerator/alloy-devkit/compare/v0.1.4...v0.2.0) (2020-03-03)


### Features

* pass file content in options ([a1ba8a0](https://github.com/appcelerator/alloy-devkit/commit/a1ba8a09aa46d404de7794b44aee9d2d1165e03d))





## [0.1.4](https://github.com/appcelerator/alloy-devkit/compare/v0.1.3...v0.1.4) (2020-02-27)


### Bug Fixes

* **compiler:** use function to disable replacement patterns ([792240f](https://github.com/appcelerator/alloy-devkit/commit/792240fc808b0495b578e298d0261faeb3f2575c))
* **utils:** remove scanning of unused widget path ([1b3eba6](https://github.com/appcelerator/alloy-devkit/commit/1b3eba6b4cbe5e39eff0892bd4f5e02372f72b54))





## [0.1.3](https://github.com/appcelerator/alloy-devkit/compare/v0.1.2...v0.1.3) (2020-01-28)


### Bug Fixes

* **utils:** add missing moment dependency ([1e9a92c](https://github.com/appcelerator/alloy-devkit/commit/1e9a92cbf9045f3a72e0f55a7b7a1a8a0a27e403))
* **utils:** read template from correct folder ([e673a4e](https://github.com/appcelerator/alloy-devkit/commit/e673a4ed8fff1ee4e8a88c350cb4c17b378663ec))





## [0.1.2](https://github.com/appcelerator/alloy-devkit/compare/v0.1.1...v0.1.2) (2020-01-27)


### Bug Fixes

* access build platform from alloy config ([dcd141a](https://github.com/appcelerator/alloy-devkit/commit/dcd141abe4529c4197c6ededd1fdea7fe44e70b2))
* add missing templates ([5779a29](https://github.com/appcelerator/alloy-devkit/commit/5779a29a0d2cbafcc58d24d7ed32d910ee83bd63))
* path to builtins ([f78527a](https://github.com/appcelerator/alloy-devkit/commit/f78527a7b5f10b38e26b6f21fa0c7d47383bb979))





## [0.1.1](https://github.com/appcelerator/alloy-devkit/compare/v0.1.0...v0.1.1) (2020-01-24)


### Bug Fixes

* **compiler:** look up correct platform during optimization ([70d0cdc](https://github.com/appcelerator/alloy-devkit/commit/70d0cdcf922d28c956eca83e601223e20cb9ab3c))





# 0.1.0 (2020-01-24)


### Bug Fixes

* **compiler:** properly concat dependency file list ([cd8a812](https://github.com/appcelerator/alloy-devkit/commit/cd8a8128793f2728c09eece36928c8ff9daf9dc2))
* **compiler:** set log level to error by default ([b2c9c56](https://github.com/appcelerator/alloy-devkit/commit/b2c9c567aa9b4abf9dc06a5c2d85f08be6fbf371))
* **utils:** titanium runtime compatible constants ([ccb7e32](https://github.com/appcelerator/alloy-devkit/commit/ccb7e324eca2441aa7ab4cb533f6bf8a1465e68c))
* add missing logs ([1bcb31d](https://github.com/appcelerator/alloy-devkit/commit/1bcb31d5ef068008d288e210b7ae2e930ac50af9))
* create compile config from matching option property ([b10f8df](https://github.com/appcelerator/alloy-devkit/commit/b10f8df98dd45d5166771fbddca8bd301814a460))
* replace path.existsSync usage ([5b15968](https://github.com/appcelerator/alloy-devkit/commit/5b1596877a6bec3f5988c55550d0872370b1a2cf))
* use single cache across instances ([65f53b5](https://github.com/appcelerator/alloy-devkit/commit/65f53b5fcacded16ff668a36e93e489509fd4472))


### Features

* **compiler:** export function to configure babel plugins ([4d2b086](https://github.com/appcelerator/alloy-devkit/commit/4d2b086d0a0697a97ad95211c97e89561a19950d))
