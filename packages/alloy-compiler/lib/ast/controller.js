var U = require('alloy-utils').utils,
	babylon = require('@babel/parser'),
	types = require('@babel/types'),
	generate = require('@babel/generator').default,
	{ default: traverse, Hub, NodePath } = require('@babel/traverse');

var isBaseControllerExportExpression = types.buildMatchMemberExpression('exports.baseController');

let GENCODE_OPTIONS = {
	retainLines: true
};

exports.processController = function (code, file, options = {}) {
	if (typeof options === 'boolean') {
		options = { isProduction: options };
	}

	var baseController = '',
		moduleCodes = '',
		newCode = '';

	const controllerExportTarget = options.controllerExportTarget || 'exports';

	function buildExportTargetMember(exportedName) {
		return types.isValidIdentifier(exportedName)
			? types.memberExpression(types.identifier(controllerExportTarget), types.identifier(exportedName))
			: types.memberExpression(types.identifier(controllerExportTarget), types.stringLiteral(exportedName), true);
	}

	function buildExportAssignment(exportedName, localName) {
		return types.expressionStatement(
			types.assignmentExpression(
				'=',
				buildExportTargetMember(exportedName),
				types.identifier(localName)
			)
		);
	}

	var alloyCreateImports = [];

	function addAlloyCreateImport(specifier, specifiers) {
		var existing = alloyCreateImports.find(function (entry) {
			return entry.specifier === specifier && entry.specifiers.join('|') === specifiers.join('|');
		});
		if (!existing) {
			alloyCreateImports.push({
				specifier: specifier,
				specifiers: specifiers
			});
		}
	}

	function createImportName(prefix, name) {
		return prefix + name.replace(/[^A-Za-z0-9_$]/g, '_');
	}

	function createModelModuleName(name) {
		if (!name) {
			return name;
		}

		return name[0].toUpperCase() + name.substr(1);
	}

	function buildNamedImport(specifier, importedName, localName) {
		addAlloyCreateImport(specifier, [
			importedName + ' as ' + localName
		]);
	}

	function renderAlloyCreateImports() {
		return alloyCreateImports.map(function (entry) {
			var importSpecifiers = entry.specifiers.map(function (specifier) {
				var parts = specifier.split(' as ');
				if (parts.length === 2) {
					return types.importSpecifier(types.identifier(parts[1]), types.identifier(parts[0]));
				}

				return types.importDefaultSpecifier(types.identifier(specifier));
			});
			return generate(types.importDeclaration(importSpecifiers, types.stringLiteral(entry.specifier)), GENCODE_OPTIONS).code;
		}).join('\n');
	}

	function getAlloyCreateMethod(node) {
		if (!types.isCallExpression(node) || !types.isMemberExpression(node.callee)) {
			return null;
		}
		if (!types.isIdentifier(node.callee.object, { name: 'Alloy' }) || !types.isIdentifier(node.callee.property)) {
			return null;
		}
		var method = node.callee.property.name;
		return method === 'createController' || method === 'createModel' || method === 'createCollection' || method === 'createWidget'
			? method
			: null;
	}

	function getWidgetCreateMethod(node) {
		if (!types.isCallExpression(node) || !types.isMemberExpression(node.callee)) {
			return null;
		}
		if (!types.isIdentifier(node.callee.object, { name: 'Widget' }) || !types.isIdentifier(node.callee.property)) {
			return null;
		}
		var method = node.callee.property.name;
		return method === 'createController' || method === 'createModel' || method === 'createCollection'
			? method
			: null;
	}

	function createWidgetImportName(widgetId, name) {
		return createImportName('__AlloyCreatedWidget_', widgetId + '_' + name);
	}

	function createWidgetModuleImportName(widgetId, name) {
		return createImportName('__AlloyWidgetModule_', widgetId + '_' + name);
	}

	function createWpathValue(widgetId, name) {
		var index = name.lastIndexOf('/');
		var widgetPath = index === -1
			? widgetId + '/' + name
			: name.substring(0, index) + '/' + widgetId + '/' + name.substring(index + 1);

		return widgetPath.indexOf('/') !== 0 ? '/' + widgetPath : widgetPath;
	}

	function buildWidgetControllerImport(widgetId, name) {
		var constructorName = createWidgetImportName(widgetId, name);
		addAlloyCreateImport('/alloy/widgets/' + widgetId + '/controllers/' + name, [ constructorName ]);
		return constructorName;
	}

	function transformAlloyCreateCall(path) {
		var method = getAlloyCreateMethod(path.node);
		if (!method) {
			return;
		}

		var nameArg = path.node.arguments[0];
		if (!types.isStringLiteral(nameArg)) {
			throw path.buildCodeFrameError(
				'Alloy.' + method + '(name) is not statically loadable in Alloy ESM mode. Use an ESM import for literal names or Vite-compatible dynamic import() for dynamic names.'
			);
		}

		var name = nameArg.value;
		var args = path.node.arguments.slice(1);
		var constructorName;

		if (method === 'createController') {
			constructorName = createImportName('__AlloyController_', name);
			addAlloyCreateImport('/alloy/controllers/' + name, [ constructorName ]);
		} else if (method === 'createWidget') {
			var widgetControllerName = 'widget';
			var widgetArgsStart = 1;
			if (types.isStringLiteral(path.node.arguments[1])) {
				widgetControllerName = path.node.arguments[1].value;
				widgetArgsStart = 2;
			}
			constructorName = buildWidgetControllerImport(name, widgetControllerName);
			args = path.node.arguments.slice(widgetArgsStart);
		} else if (method === 'createModel') {
			var modelName = createModelModuleName(name);
			constructorName = createImportName('__AlloyModel_', modelName);
			buildNamedImport('/alloy/models/' + modelName, 'Model', constructorName);
		} else {
			var collectionName = createModelModuleName(name);
			constructorName = createImportName('__AlloyCollection_', collectionName);
			buildNamedImport('/alloy/models/' + collectionName, 'Collection', constructorName);
		}

		path.replaceWith(types.newExpression(types.identifier(constructorName), args));
	}

	function transformWidgetCreateCall(path) {
		var method = getWidgetCreateMethod(path.node);
		if (!method) {
			return;
		}
		if (!options.widgetId) {
			throw path.buildCodeFrameError('Widget.' + method + '(name) can only be used inside a widget controller.');
		}

		var nameArg = path.node.arguments[0];
		if (!types.isStringLiteral(nameArg)) {
			throw path.buildCodeFrameError(
				'Widget.' + method + '(name) is not statically loadable in Alloy ESM mode. Use an ESM import for literal names or Vite-compatible dynamic import() for dynamic names.'
			);
		}

		var name = nameArg.value;
		var args = path.node.arguments.slice(1);
		var constructorName;

		if (method === 'createController') {
			constructorName = buildWidgetControllerImport(options.widgetId, name);
		} else if (method === 'createModel') {
			var modelName = createModelModuleName(name);
			constructorName = createImportName('__AlloyWidgetModel_', options.widgetId + '_' + modelName);
			buildNamedImport('/alloy/widgets/' + options.widgetId + '/models/' + modelName, 'Model', constructorName);
		} else {
			var collectionName = createModelModuleName(name);
			constructorName = createImportName('__AlloyWidgetCollection_', options.widgetId + '_' + collectionName);
			buildNamedImport('/alloy/widgets/' + options.widgetId + '/models/' + collectionName, 'Collection', constructorName);
		}

		path.replaceWith(types.newExpression(types.identifier(constructorName), args));
	}

	function getLiteralWpathArgument(node) {
		if (!types.isCallExpression(node) || !types.isIdentifier(node.callee, { name: 'WPATH' })) {
			return null;
		}
		var nameArg = node.arguments[0];
		if (!types.isStringLiteral(nameArg)) {
			return false;
		}
		return nameArg.value;
	}

	function transformWpathCall(path) {
		var wpathValue = getLiteralWpathArgument(path.node);
		if (wpathValue === null) {
			return false;
		}
		if (!options.widgetId) {
			throw path.buildCodeFrameError('WPATH() can only be used inside a widget controller.');
		}
		if (wpathValue === false) {
			throw path.buildCodeFrameError(
				'WPATH(path) is not statically loadable in Alloy ESM mode. Use a literal path or migrate to an ESM import.'
			);
		}

		path.replaceWith(types.stringLiteral(createWpathValue(options.widgetId, wpathValue)));
		return true;
	}

	function transformRequireWpathCall(path) {
		if (!types.isCallExpression(path.node) || !types.isIdentifier(path.node.callee, { name: 'require' })) {
			return false;
		}

		var wpathValue = getLiteralWpathArgument(path.node.arguments[0]);
		if (wpathValue === null) {
			return false;
		}
		if (!options.widgetId) {
			throw path.buildCodeFrameError('require(WPATH()) can only be used inside a widget controller.');
		}
		if (wpathValue === false) {
			throw path.buildCodeFrameError(
				'require(WPATH(path)) is not statically loadable in Alloy ESM mode. Use a literal path or migrate to an ESM import.'
			);
		}

		var localName = createWidgetModuleImportName(options.widgetId, wpathValue);
		addAlloyCreateImport('/alloy/widgets/' + options.widgetId + '/lib/' + wpathValue, [ localName ]);
		path.replaceWith(types.identifier(localName));
		path.skip();
		return true;
	}

	if (options.isProduction) {
		GENCODE_OPTIONS.retainLines = false;
	}

	try {
		var ast = babylon.parse(code, { sourceFilename: file, sourceType: 'unambiguous' });

		const hub = new Hub();
		hub.buildError = function (node, message, Error) {
			const loc = node && node.loc;
			const err = new Error(message);

			if (loc) {
				err.loc = loc.start;
			}

			return err;
		};
		const path = NodePath.get({
			hub: hub,
			parent: ast,
			container: ast,
			key: 'program'
		}).setContext();
		traverse(ast, {
			enter: function (path) {
				if (types.isAssignmentExpression(path.node) && isBaseControllerExportExpression(path.node.left)) {
					// what's equivalent of print_to_string()? I replaced with simple value property assuming it's a string literal
					baseController = '\'' + path.node.right.value + '\'';
				}
			},

			ImportDeclaration: function (path) {
				moduleCodes += generate(path.node, GENCODE_OPTIONS).code;
				path.remove();
			},

			ExportNamedDeclaration: function (path) {
				var node = path.node;

				if (node.source) {
					if (node.specifiers && node.specifiers.length !== 0) {
						const importSpecifiers = node.specifiers
							.filter(function (specifier) { return specifier.local && specifier.local.name; })
							.map(function (specifier) {
								return types.importSpecifier(
									types.identifier(specifier.local.name),
									types.identifier(specifier.local.name)
								);
							});
						if (importSpecifiers.length > 0) {
							moduleCodes += generate(types.importDeclaration(importSpecifiers, node.source), GENCODE_OPTIONS).code;
						}
						path.replaceWithMultiple(node.specifiers
							.filter(function (specifier) { return specifier.local && specifier.local.name; })
							.map(function (specifier) {
								var localName = specifier.local.name;
								var exportedName = specifier.exported && (specifier.exported.name || specifier.exported.value) || localName;
								return buildExportAssignment(exportedName, localName);
							}));
						return;
					}

					moduleCodes += generate(node, GENCODE_OPTIONS).code;
					path.remove();
					return;
				}

				if (node.declaration) {
					var decl = node.declaration;
					var replacements = [ decl ];
					if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') {
						if (decl.id && decl.id.name) {
							replacements.push(buildExportAssignment(decl.id.name, decl.id.name));
						}
					} else if (decl.type === 'VariableDeclaration') {
						decl.declarations.forEach(function (d) {
							if (d.id && d.id.name) {
								replacements.push(buildExportAssignment(d.id.name, d.id.name));
							}
						});
					}
					path.replaceWithMultiple(replacements);
					return;
				}

				if (node.specifiers && node.specifiers.length !== 0) {
					path.replaceWithMultiple(node.specifiers
						.filter(function (specifier) { return specifier.local && specifier.local.name; })
						.map(function (specifier) {
							var localName = specifier.local.name;
							var exportedName = specifier.exported && (specifier.exported.name || specifier.exported.value) || localName;
							return buildExportAssignment(exportedName, localName);
						}));
					return;
				}

				moduleCodes += generate(node, GENCODE_OPTIONS).code;
				path.remove();
			},

			CallExpression: function (path) {
				if (options.transformAlloyCreate) {
					if (transformRequireWpathCall(path)) {
						return;
					}
					transformAlloyCreateCall(path);
					transformWidgetCreateCall(path);
					transformWpathCall(path);
				}
			}
		}, path.scope);

		newCode = generate(ast, GENCODE_OPTIONS).code;
		moduleCodes += renderAlloyCreateImports();
	} catch (e) {
		if (e.loc) {
			U.dieWithCodeFrame(e.message, e.loc, code);
		}
		U.die('Error generating AST for "' + file + '". ' + e.message, e);
	}

	return {
		es6mods: moduleCodes,
		base: baseController,
		code: newCode
	};
};
