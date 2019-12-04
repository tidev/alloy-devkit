const {
	constants: CONST,
	logger,
	platforms,
	tiapp,
	tssGrammar,
	utils: U,
} = require('alloy-utils');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');

const optimizer = require('./optimizer');
const styler = require('./styler');
const CU = require('../utils');

const { SourceMapGenerator } = require('source-map');

const componentRegex = /(?:[/\\]widgets[/\\][^/\\]+)?[/\\](?:controllers|views|styles)[/\\](.*)/;

module.exports = class BaseCompiler {
	constructor(options) {
		this.config = options.compileConfig;
		this.projectDir = this.config.dir.project;
		this.appDir = this.config.dir.home;
		this.platform = this.config.alloyConfig.platform;
		this.titaniumFolder = platforms[this.platform].titaniumFolder;
		this.otherPlatforms = _.without(CONST.PLATFORM_FOLDERS, this.titaniumFolder);
		this.fs = options.fs || fs;
		this.templateDir = path.resolve(__dirname, '..', 'template');
		this.metaCache = new Map();
		this.styleCache = new Map();

		// This needs to be initialized before any compile command
		tiapp.init(path.join(this.projectDir, 'tiapp.xml'));
		// validate the current Titanium SDK version, exit on failure
		tiapp.validateSdkVersion();

		// Load global styles
		styler.setPlatform(this.platform);
		// TODO: support themes
		const theme = false;
		this.theme = this.config.theme;
		styler.loadGlobalStyles(this.appDir, theme ? { theme } : {});

		this.createSourceCollection();
	}

	createSourceCollection() {
		this.widgets = this.findAllWidgets();
		this.models = this.findAllModels();
		this.models.forEach(m => {
			CU.models.push(m.name);
		});
	}

	findAllWidgets() {
		const widgetDirs = U.getWidgetDirectories(this.appDir);
		const widgets = new Map();
		widgetDirs.forEach(widget => widgets.set(widget.dir, widget));
		return widgets;
	}

	findAllModels() {
		const widgetDirs = U.getWidgetDirectories(this.appDir);
		widgetDirs.push({ dir: path.join(this.projectDir, CONST.ALLOY_DIR) });

		const models = [];
		widgetDirs.forEach(collection => {
			const modelDir = path.join(collection.dir, CONST.DIR.MODEL);
			if (!fs.existsSync(modelDir)) {
				return;
			}

			fs.readdirSync(modelDir).forEach(file => {
				var fullpath = path.join(modelDir, file);
				var basename = path.basename(fullpath, '.' + CONST.FILE_EXT.MODEL);
				models.push({
					name: basename,
					path: fullpath
				});
			});
		});

		return models;
	}

	resolveComponentMeta(componentPath) {
		const componentIdentifier = this.resolveComponentIdentifier(componentPath);
		const widget = this.findWidget(componentPath);
		const manifest = widget ? widget.manifest : null;
		const cacheIdentifier = `${manifest ? manifest.id : 'app'}/${componentIdentifier}`;
		if (this.metaCache.has(cacheIdentifier)) {
			return this.metaCache.get(cacheIdentifier);
		}

		const meta = {
			componentIdentifier,
			basePath: widget ? widget.dir : this.appDir,
			subPath: path.dirname(componentIdentifier),
			componentName: path.basename(componentIdentifier),
			widget,
			manifest,
			cacheIdentifier
		};
		const files = this.generatePossibleFilePaths(meta);
		meta.files = files;
		this.metaCache.set(cacheIdentifier, meta);

		return meta;
	}

	createTemplateObject(componentMeta) {
		const {
			manifest,
			componentName: viewName,
			subPath: dirname
		} = componentMeta;
		return {
			viewCode: '',
			modelVariable: CONST.BIND_MODEL_VAR,
			parentVariable: CONST.PARENT_SYMBOL_VAR,
			itemTemplateVariable: CONST.ITEM_TEMPLATE_VAR,
			controllerPath: (dirname ? path.join(dirname, viewName) : viewName).replace(/\\/g, '/'),
			preCode: '',
			postCode: '',
			Widget: !manifest ? '' : 'const ' + CONST.WIDGET_OBJECT
				+ ` = new (require('/alloy/widget'))('${manifest.id}');this.__widgetId='`
				+ manifest.id + '\';',
			WPATH: !manifest ? '' : _.template(fs.readFileSync(path.join(this.templateDir, 'wpath.js'), 'utf8'))({ WIDGETID: manifest.id }),
			ES6Mod: ''
		};
	}

	resetState(meta) {
		const { manifest, componentName } = meta;
		styler.bindingsMap = {};
		CU.destroyCode = '';
		CU.postCode = '';
		CU[CONST.AUTOSTYLE_PROPERTY] = this.config[CONST.AUTOSTYLE_PROPERTY];
		CU.currentManifest = manifest;
		CU.currentDefaultId = componentName;
	}

	compileComponent(options) {
		if (!options.file) {
			throw new Error('Missing "file" option.');
		}

		const componentPath = options.file;
		const compileConfig = this.config;
		const meta = this.resolveComponentMeta(componentPath);
		const template = this.createTemplateObject(meta);
		const files = meta.files;
		let dependencies = [];

		// reset the bindings map
		this.resetState(meta);

		const hasView = this.fs.existsSync(files.VIEW);
		if (hasView) {
			const {
				preCode,
				viewCode,
				postCode,
				dependencies: viewDependencies
			} = this.compileView({
				file: files.VIEW
			});
			template.preCode = preCode;
			template.viewCode = viewCode;
			template.postCode = postCode;
			dependencies = dependencies.concat(viewDependencies)
		}

		// process the controller code
		const cCode = CU.loadController(files.CONTROLLER);
		let controllerCode = '';
		template.parentController = (cCode.parentControllerName !== '')
			? cCode.parentControllerName
			: CU[CONST.DOCROOT_BASECONTROLLER_PROPERTY] || '\'BaseController\'';
		controllerCode += cCode.controller;
		template.preCode += cCode.pre;
		template.ES6Mod += cCode.es6mods;

		// create generated controller module code for this view/controller or widget
		let codeTemplate = _.template(fs.readFileSync(path.join(compileConfig.dir.template, 'component.js'), 'utf8'))(template);

		const map = new SourceMapGenerator({
			file: files.COMPONENT,
			sourceRoot: this.projectDir
		});
		const relativeControllerPath = path.relative(this.projectDir, files.CONTROLLER);
		let markerLineNumber = codeTemplate.split('\n').findIndex(line => line.includes('__MAPMARKER_CONTROLLER_CODE__'));
		let generatedLineNumber = markerLineNumber + 1;
		let paddedControllerCode = '';
		const controllerCodeLines = controllerCode.split('\n');
		for (let i = 0; i < controllerCodeLines.length; i++) {
			const line = controllerCodeLines[i];
			map.addMapping({
				generated: {
					line: generatedLineNumber++,
					column: 1
				},
				original: {
					line: i + 1,
					column: 0
				},
				source: relativeControllerPath
			});
			paddedControllerCode += `${line}${i < controllerCodeLines.length - 1 ? '\n\t' : ''}`;
		}
		map.setSourceContent(relativeControllerPath, controllerCode);
		let code = codeTemplate.replace('__MAPMARKER_CONTROLLER_CODE__', paddedControllerCode);
		code = code.replace(/^\t\n/gm, '\n');

		return {
			code,
			map,
			dependencies
		};
	}

	compileView(options) {
		if (!options.file) {
			throw new Error('Missing "file" option.');
		}

		let viewCode = '';
		let preCode = '';
		const meta = this.resolveComponentMeta(options.file);
		const {
			componentName: viewName,
			subPath: dirname,
			manifest,
			files
		} = meta;
		const { styles, files: styleFiles } = this.loadStyles(meta);
		const state = { parent: {}, styles };

		// Load view from file into an XML document root node
		const docRoot = U.XML.getAlloyFromFile(files.VIEW);

		// see if autoStyle is enabled for the view
		if (docRoot.hasAttribute(CONST.AUTOSTYLE_PROPERTY)) {
			CU[CONST.AUTOSTYLE_PROPERTY] = docRoot.getAttribute(CONST.AUTOSTYLE_PROPERTY) === 'true';
		}

		// see if module attribute has been set on the docRoot (<Alloy>) tag for the view
		if (docRoot.hasAttribute(CONST.DOCROOT_MODULE_PROPERTY)) {
			CU[CONST.DOCROOT_MODULE_PROPERTY] = docRoot.getAttribute(CONST.DOCROOT_MODULE_PROPERTY);
		} else {
			CU[CONST.DOCROOT_MODULE_PROPERTY] = null;
		}

		// see if baseController attribute has been set on the docRoot (<Alloy>) tag for the view
		if (docRoot.hasAttribute(CONST.DOCROOT_BASECONTROLLER_PROPERTY)) {
			CU[CONST.DOCROOT_BASECONTROLLER_PROPERTY] = '"' + docRoot.getAttribute(CONST.DOCROOT_BASECONTROLLER_PROPERTY) + '"';
		} else {
			CU[CONST.DOCROOT_BASECONTROLLER_PROPERTY] = null;
		}

		// make sure we have a Window, TabGroup, or SplitWindow
		let rootChildren = U.XML.getElementsFromNodes(docRoot.childNodes);
		if (viewName === 'index' && !dirname) {
			const valid = [
				'Ti.UI.Window',
				'Ti.UI.iOS.SplitWindow',
				'Ti.UI.TabGroup',
				'Ti.UI.iOS.NavigationWindow',
				'Ti.UI.NavigationWindow'
			].concat(CONST.MODEL_ELEMENTS);
			rootChildren.forEach(node => {
				let found = true;
				const args = CU.getParserArgs(node, {}, { doSetId: false });

				if (args.fullname === 'Alloy.Require') {
					const inspect = CU.inspectRequireNode(node);
					for (let j = 0; j < inspect.names.length; j++) {
						if (!_.includes(valid, inspect.names[j])) {
							found = false;
							break;
						}
					}
				} else {
					found = _.includes(valid, args.fullname);
				}

				if (!found) {
					throw new Error('Compile failed. index.xml must have a top-level container element. '
						+ 'Valid elements: [' + valid.join(',') + ']'
					);
				}
			});
		}

		preCode = this.processModels(docRoot, state);

		// rebuild the children list since model elements have been removed
		rootChildren = U.XML.getElementsFromNodes(docRoot.childNodes);

		// process the UI nodes
		rootChildren.forEach(node => {
			// should we use the default id?
			const defaultId = CU.isNodeForCurrentPlatform(node) ? viewName : undefined;

			// generate the code for this node
			viewCode += CU.generateNode(node, {
				parent: {},
				styles: state.styles,
				widgetId: manifest ? manifest.id : undefined,
				parentFormFactor: node.hasAttribute('formFactor') ? node.getAttribute('formFactor') : undefined
			}, defaultId, true);
		});

		// for each model variable in the bindings map...
		_.each(styler.bindingsMap, (mapping, modelVar) => {

			// open the model binding handler
			var handlerVar = CU.generateUniqueId();
			viewCode += 'var ' + handlerVar + ' = function() {';

			_.each(mapping.models, modelVar => {
				viewCode += modelVar + '.__transform = _.isFunction(' + modelVar + '.transform) ? ' + modelVar + '.transform() : ' + modelVar + '.toJSON();';
			});

			CU.destroyCode += `${modelVar} && ${state.parentFormFactor ? 'is' + U.ucfirst(state.parentFormFactor) : ''}
				${modelVar}.off('${CONST.MODEL_BINDING_EVENTS}', ${handlerVar});`;

			// for each specific conditional within the bindings map....
			_.each(_.groupBy(mapping.bindings, b => b.condition), (bindings, condition) => {
				var bCode = '';

				// for each binding belonging to this model/conditional pair...
				_.each(bindings, binding => {
					bCode += '$.' + binding.id + '.' + binding.prop + ' = ' + binding.val + ';';
				});

				// if this is a legit conditional, wrap the binding code in it
				if (typeof condition !== 'undefined' && condition !== 'undefined') {
					bCode = 'if(' + condition + '){' + bCode + '}';
				}
				viewCode += bCode;
			});
			viewCode += '};';
			viewCode += modelVar + `.on('${CONST.MODEL_BINDING_EVENTS}', ${handlerVar});`;
		});

		// add destroy() function to view for cleaning up bindings
		viewCode += 'exports.destroy = function () {' + CU.destroyCode + '};';

		// add dataFunction of original name (if data-binding with form factor has been used)
		if (!_.isEmpty(CU.dataFunctionNames)) {
			_.each(Object.keys(CU.dataFunctionNames), funcName => {
				viewCode += 'function ' + funcName + '() { ';
				_.each(CU.dataFunctionNames[funcName], formFactor => {
					viewCode += '	if(Alloy.is' + U.ucfirst(formFactor) + ') { ' + funcName + U.ucfirst(formFactor) + '(); } ';
				});
				viewCode += '}';
			});
		}

		// add any postCode after the controller code
		const postCode = CU.postCode;

		return {
			preCode,
			viewCode,
			postCode,
			dependencies: [
				files.VIEW,
				...styleFiles
			]
		};
	}

	compileStyle(options) {
		if (!options.file) {
			throw new Error('Missing "file" option.');
		}

		const meta = this.resolveComponentMeta(options.file);
		const { manifest } = meta;
		const buildPlatform = this.platform;
		const styleMeta = this.loadStyles(meta);
		const state = { styles: styleMeta.styles }

		const STYLE_PLACEHOLDER = '__STYLE_PLACEHOLDER__';
		const STYLE_REGEX = new RegExp('[\'"]' + STYLE_PLACEHOLDER + '[\'"]');
		const processedStyles = [];
		for (const s of state.styles) {
			const o = {};

			// make sure this style entry applies to the current platform
			if (s && s.queries && s.queries.platform
				&& !s.queries.platform.includes(buildPlatform)) {
				continue;
			}

			// get the runtime processed version of the JSON-safe style
			const processed = '{' + styler.processStyle(s.style, state) + '}';

			// create a temporary style object, sans style key
			Object.keys(s, k => {
				const v = s[k];
				if (k === 'queries') {
					const queriesMap = new Map();

					// optimize style conditionals for runtime
					Object.keys(v, queryKey => {
						const query = v[queryKey];
						if (queryKey === 'platform') {
							// do nothing, we don't need the platform key anymore
						} else if (queryKey === 'formFactor') {
							queriesMap.set(queryKey, 'is' + U.ucfirst(query));
						} else if (queryKey === 'if') {
							queriesMap.set(queryKey, query);
						} else {
							this.emitWarning(`Unknown device query "${queryKey}"`);
						}
					});

					// add the queries object, if not empty
					if (queriesMap.size > 0) {
						const queriesObj = {};
						queriesMap.forEach((v, k) => queriesObj[k] = v);
						o[k] = queriesObj;
					}
				} else if (k !== 'style') {
					o[k] = v;
				}
			});

			// Create a full processed style string by inserting the processed style
			// into the JSON stringifed temporary style object
			o.style = STYLE_PLACEHOLDER;
			processedStyles.push(JSON.stringify(o).replace(STYLE_REGEX, processed));
		}

		let styleCode = 'module.exports = [' + processedStyles.join(',') + '];';
		if (manifest) {
			styleCode += _.template(fs.readFileSync(path.join(this.templateDir, 'wpath.js'), 'utf8'))({ WIDGETID: manifest.id });
		}

		return {
			code: styleCode,
			dependencies: styleMeta.files
		}
	}

	loadStyles(meta) {
		const {
			cacheIdentifier,
			componentName: viewName,
			basePath: dir,
			subPath: dirname,
			manifest,
			files: componentFiles
		} = meta;

		if (this.styleCache.has(cacheIdentifier)) {
			return this.styleCache.get(cacheIdentifier);
		}

		const { config: compileConfig, theme } = this;
		let styles = styler.globalStyle || [];
		const files = [ path.join(this.appDir, 'styles', 'app.tss') ];
		let message = '';

		if (componentFiles.STYLE) {
			var styleFiles = Array.isArray(componentFiles.STYLE) ? componentFiles.STYLE : [ { file: componentFiles.STYLE } ];
			styleFiles.forEach(style => {
				message = '  style:      "' +
					path.relative(path.join(dir, CONST.DIR.STYLE), style.file) + '"';
				styles = this.loadStyleFile(style.file, styles, {
					existingStyle: styles,
					platform: style.platform
				}, message);
				files.push(style.file);
			});
		}

		if (this.theme) {
			// if a theme is applied, override TSS definitions with those defined in the theme
			let themeStylesDir, theStyle, themeStylesFile, psThemeStylesFile;
			if (!manifest) {
				// theming a "normal" controller
				themeStylesDir = path.join(compileConfig.dir.themes, theme, 'styles');
				theStyle = dirname ? path.join(dirname, viewName + '.tss') : viewName + '.tss';
				themeStylesFile = path.join(themeStylesDir, theStyle);
				psThemeStylesFile = path.join(themeStylesDir, buildPlatform, theStyle);
			} else {
				// theming a widget
				themeStylesDir = path.join(compileConfig.dir.themes, theme, 'widgets', manifest.id, 'styles');
				theStyle = dirname ? path.join(dirname, viewName + '.tss') : viewName + '.tss';
				themeStylesFile = path.join(themeStylesDir, theStyle);
				psThemeStylesFile = path.join(themeStylesDir, buildPlatform, theStyle);
			}

			// load theme-specific styles, overriding default definitions
			message = '  theme:      "' + path.join(theme.toUpperCase(), theStyle) + '"';
			styles = this.loadStyleFile(themeStylesFile, styles, {
				existingStyle: styles,
				theme: true
			}, message);
			files.push(themeStylesFile);

			// load theme- and platform-specific styles, overriding default definitions
			message = '  theme:      "' +
				path.join(theme.toUpperCase(), buildPlatform, theStyle) + '"';
			styles = this.loadStyleFile(psThemeStylesFile, styles, {
				existingStyle: styles,
				platform: true,
				theme: true
			}, message);
			files.push(psThemeStylesFile);
		}

		const styleMeta = {
			styles,
			files
		};
		this.styleCache.set(cacheIdentifier, styleMeta);

		return styleMeta;
	}

	loadStyleFile(tssFilePath, existingStyle, sortOptions, message) {
		try {
			const styleContent = this.fs.readFileSync(tssFilePath);
			logger.info(message);
			const json = this.parseStyle(styleContent, tssFilePath);
			return styler.sortStyles(json, sortOptions);
		} catch (e) {
			if (e.code !== 'ENOENT') {
				throw e;
			}

			return existingStyle
		}
	}

	parseStyle(content, tssFile) {
		const originalContents = content;
		let addedBraces = false;

		// skip if the file is empty
		if (/^\s*$/gi.test(content)) {
			return {};
		}

		// Add enclosing curly braces, if necessary
		if (!/^\s*\{[\s\S]+\}\s*$/gi.test(content)) {
			content = '{\n' + content + '\n}';
			addedBraces = true;
		}
		// [ALOY-793] double-escape '\' in tss
		content = content.replace(/(\s)(\\+)(\s)/g, '$1$2$2$3');

		try {
			const json = tssGrammar.parse(content);
			optimizer.optimizeStyle(json);
			return json;
		} catch (e) {
			// If we added braces to the contents then the actual line number
			// on the original contents is one less than the error reports
			if (addedBraces) {
				e.line--;
			}
			U.dieWithCodeFrame(
				'Error processing style "' + tssFile + '"',
				{ line: e.line, column: e.column },
				originalContents,
				/Expected bare word, comment, end of line, string or whitespace but ".+?" found\./.test(e.message)
					? 'Do you have an extra comma in your style definition?'
					: ''
			);
		}

		return {};
	}

	findWidget(componentPath) {
		for (const widgetDir of this.widgets.keys()) {
			if (componentPath.startsWith(widgetDir)) {
				return this.widgets.get(widgetDir);
			}
		}
		return null;
	}

	resolveComponentIdentifier(componentPath) {
		const match = componentPath.match(componentRegex);
		if (!match) {
			throw new Error(`Failed to resolve component identifier for "${componentPath}"`);
		}
		const relPath = match[1];
		return path.join(path.dirname(relPath), path.basename(relPath, path.extname(relPath)));
	}

	generatePossibleFilePaths(meta) {
		const {
			basePath: rootDir,
			componentName: viewName,
			subPath
		} = meta;
		const buildPlatform = this.platform;
		const files = {};
		const inputTypes = [ 'VIEW', 'STYLE', 'CONTROLLER' ];
		inputTypes.forEach(fileType => {
			// get the path values for the file
			const fileTypeRoot = path.join(rootDir, CONST.DIR[fileType]);
			const filename = viewName + '.' + CONST.FILE_EXT[fileType];
			const filepath = subPath ? path.join(subPath, filename) : filename;
			const baseFile = path.join(fileTypeRoot, filepath);

			// check for platform-specific versions of the file
			if (buildPlatform) {
				var platformSpecificFile = path.join(fileTypeRoot, buildPlatform, filepath);
				if (fs.existsSync(platformSpecificFile)) {
					if (fileType === 'STYLE') {
						files[fileType] = [
							{ file: baseFile },
							{ file: platformSpecificFile, platform: true }
						];
					} else {
						files[fileType] = platformSpecificFile;
					}
					return;
				}
			}
			files[fileType] = baseFile;
		});

		const outputTypes = [ 'COMPONENT', 'RUNTIME_STYLE' ];
		outputTypes.forEach(fileType => {
			const basePath = path.join(this.config.dir.resources, 'alloy', CONST.DIR[fileType]);
			files[fileType] = path.join(basePath, subPath, viewName + '.js');
		});

		return files;
	}

	processModels(docRoot, state) {
		let code = '';
		const rootChildren = U.XML.getElementsFromNodes(docRoot.childNodes);
		// process any model/collection nodes
		rootChildren.forEach(node => {
			const fullname = CU.getNodeFullname(node);
			const isModelElement = _.includes(CONST.MODEL_ELEMENTS, fullname);

			if (isModelElement) {
				const vCode = CU.generateNode(node, state, undefined, false, true);
				code += vCode.pre;

				// remove the model/collection nodes when done
				docRoot.removeChild(node);
			}
		});

		return code;
	}
};
