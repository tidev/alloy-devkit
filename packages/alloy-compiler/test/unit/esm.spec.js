// eslint-disable: quotes
// eslint-disable: max-len

const fs = require('fs');

const { setupCompiler, resolveComponentPath } = require('./utils');

describe('ESM compiler', () => {
	it('should attach controller ESM exports to the public controller interface', () => {
		expect.assertions(10);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const controllerPath = resolveComponentPath('controllers', 'index.js');
		const result = compiler.compileComponent({
			file: controllerPath,
			controllerContent: `
export function show() {}
export const hide = () => {};
const localName = 'value';
export { localName as publicName };
`,
		});

		expect(result.code).toContain('export default function Controller()');
		expect(result.code).toContain('import BaseController from \'/alloy/controllers/BaseController\';');
		expect(result.code).not.toContain('require(\'/alloy/controllers/\' + \'BaseController\')');
		expect(result.code).not.toContain('module.exports');
		expect(result.code).not.toContain('var exports = {};');
		expect(result.code).toContain('var controllerExports = {};');
		expect(result.code).toContain('function show() {}');
		expect(result.code).toContain('controllerExports.show = show;');
		expect(result.code).toContain('controllerExports.hide = hide;');
		expect(result.code).toContain('controllerExports.publicName = localName;');
	});

	it('should compile component correctly', () => {
		expect.assertions(1);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const controllerPath = resolveComponentPath('controllers', 'index.js');
		const result = compiler.compileComponent({
			file: controllerPath,
			content: fs.readFileSync(controllerPath, 'utf-8'),
		});

		// eslint-disable-next-line jest/no-large-snapshots
		expect(result.code).toMatchInlineSnapshot(`
		"import Alloy from '/alloy';
		import BaseController from '/alloy/controllers/BaseController';


		const Backbone = Alloy.Backbone;
		const _ = Alloy._;




		function __processArg(obj, key) {
			var arg = null;
			if (obj) {
				arg = obj[key] || null;
			}
			return arg;
		}

		export default function Controller() {

			BaseController.apply(this, Array.prototype.slice.call(arguments));
			this.__controllerPath = 'index';
			this.args = arguments[0] || {};

			if (arguments[0]) {
				var __parentSymbol = __processArg(arguments[0], '__parentSymbol');
				var $model = __processArg(arguments[0], '$model');
				var __itemTemplate = __processArg(arguments[0], '__itemTemplate');
			}
			var $ = this;
			var controllerExports = {};
			var __defers = {};

			// Generated code that must be executed before all UI and/or
			// controller code. One example is all model and collection
			// declarations from markup.


			// Generated UI code
			$.__views[\\"index\\"] = Ti.UI.createWindow(
		{backgroundColor:\\"#fff\\",fullscreen:false,exitOnClose:true,id:\\"index\\",}
		);
		$.__views[\\"index\\"] && $.addTopLevelView($.__views[\\"index\\"]);
		$.__views[\\"label\\"] = Ti.UI.createLabel(
		{color:\\"#000\\",font:{fontSize:\\"18dp\\",fontWeight:\\"bold\\",},height:Ti.UI.SIZE,width:Ti.UI.SIZE,text:'Hello, World!',id:\\"label\\",}
		);
		$.__views[\\"index\\"].add($.__views[\\"label\\"]);
		sayHello?$.addListener($.__views[\\"label\\"],'click',sayHello):__defers['$.__views[\\"label\\"]!click!sayHello']=true;controllerExports.destroy = function () {};

			// make all IDed elements in $.__views available right on the $ in a
			// controller's internal code. Externally the IDed elements will
			// be accessed with getView().
			_.extend($, $.__views);

			// Controller code directly from the developer's controller file
			$.index.open();

			function sayHello() {
			  alert('Hello World$');
			}

			// Generated code that must be executed after all UI and
			// controller code. One example deferred event handlers whose
			// functions are not defined until after the controller code
			// is executed.
			__defers['$.__views[\\"label\\"]!click!sayHello'] && $.addListener($.__views[\\"label\\"],'click',sayHello);

			// Extend the $ instance with all functions and properties
			// defined on the controller exports object.
			_.extend($, controllerExports);
		}
		"
	`);
	});

	it('should compile static Require nodes as ESM controller imports', () => {
		expect.assertions(3);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const viewPath = resolveComponentPath('views', 'require-child.xml');
		const result = compiler.compileComponent({
			file: viewPath,
		});

		expect(result.code).toContain('import __AlloyController_child from \'/alloy/controllers/child\';');
		expect(result.code).toContain('$.__views["child"] = new __AlloyController_child(');
		expect(result.code).not.toContain('Alloy.createController(\'child\'');
	});

	it('should compile static model and collection nodes as ESM model imports', () => {
		expect.assertions(5);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const viewPath = resolveComponentPath('views', 'model-nodes.xml');
		const result = compiler.compileComponent({
			file: viewPath,
		});

		expect(result.code).toContain('import { Model as __AlloyModel_book, Collection as __AlloyCollection_book } from \'/alloy/models/book\';');
		expect(result.code).toContain('$.book = new __AlloyModel_book();');
		expect(result.code).toContain('$.books = new __AlloyCollection_book();');
		expect(result.code).not.toContain('Alloy.createModel(\'book\')');
		expect(result.code).not.toContain('Alloy.createCollection(\'book\')');
	});

	it('should compile static Widget nodes as ESM widget controller imports', () => {
		expect.assertions(4);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const viewPath = resolveComponentPath('views', 'widget-node.xml');
		const result = compiler.compileComponent({
			file: viewPath,
		});

		expect(result.code).toContain('import __AlloyWidget_com_appc_grid_widget from \'/alloy/widgets/com.appc.grid/controllers/widget\';');
		expect(result.code).toContain('$.__views["grid"] = new __AlloyWidget_com_appc_grid_widget(');
		expect(result.code).not.toContain('Alloy.createWidget(\'com.appc.grid\'');
		expect(result.code).not.toContain('require(\'/alloy/widget\')');
	});

	it('should compile literal authored Alloy create calls as ESM imports', () => {
		expect.assertions(9);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const controllerPath = resolveComponentPath('controllers', 'index.js');
		const result = compiler.compileComponent({
			file: controllerPath,
			controllerContent: `
const child = Alloy.createController('child', { title: 'Child' });
const book = Alloy.createModel('Book', { title: 'Book' });
const books = Alloy.createCollection('Book');
`,
		});

		expect(result.code).toContain('import __AlloyController_child from "/alloy/controllers/child";');
		expect(result.code).toContain('import { Model as __AlloyModel_Book } from "/alloy/models/Book";');
		expect(result.code).toContain('import { Collection as __AlloyCollection_Book } from "/alloy/models/Book";');
		expect(result.code).toContain('const child = new __AlloyController_child({');
		expect(result.code).toContain('const book = new __AlloyModel_Book({');
		expect(result.code).toContain('const books = new __AlloyCollection_Book();');
		expect(result.code).not.toContain('Alloy.createController(\'child\'');
		expect(result.code).not.toContain('Alloy.createModel(\'Book\'');
		expect(result.code).not.toContain('Alloy.createCollection(\'Book\'');
	});

	it('should compile literal authored Alloy createWidget calls as ESM imports', () => {
		expect.assertions(4);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const controllerPath = resolveComponentPath('controllers', 'index.js');
		const result = compiler.compileComponent({
			file: controllerPath,
			controllerContent: `
const grid = Alloy.createWidget('com.appc.grid', { title: 'Grid' });
`,
		});

		expect(result.code).toContain('import __AlloyCreatedWidget_com_appc_grid_widget from "/alloy/widgets/com.appc.grid/controllers/widget";');
		expect(result.code).toContain('const grid = new __AlloyCreatedWidget_com_appc_grid_widget({');
		expect(result.code).not.toContain('Alloy.createWidget(\'com.appc.grid\'');
		expect(result.code).not.toContain('require(\'/alloy/widget\')');
	});

	it('should compile literal widget child controller calls as ESM imports', () => {
		expect.assertions(4);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const controllerPath = resolveComponentPath('widgets/com.appc.grid/controllers', 'widget.js');
		const result = compiler.compileComponent({
			file: controllerPath,
			controllerContent: `
const child = Widget.createController('child', { title: 'Child' });
`,
		});

		expect(result.code).toContain('import __AlloyCreatedWidget_com_appc_grid_child from "/alloy/widgets/com.appc.grid/controllers/child";');
		expect(result.code).toContain('const child = new __AlloyCreatedWidget_com_appc_grid_child({');
		expect(result.code).not.toContain('Widget.createController(\'child\'');
		expect(result.code).not.toContain('require(\'/alloy/widget\')');
	});

	it('should compile literal WPATH requires as ESM imports', () => {
		expect.assertions(5);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const controllerPath = resolveComponentPath('widgets/com.appc.grid/controllers', 'widget.js');
		const result = compiler.compileComponent({
			file: controllerPath,
			controllerContent: `
const Button = require(WPATH('button'));
`,
		});

		expect(result.code).toContain('import __AlloyWidgetModule_com_appc_grid_button from "/alloy/widgets/com.appc.grid/lib/button";');
		expect(result.code).toContain('const Button = __AlloyWidgetModule_com_appc_grid_button;');
		expect(result.code).not.toContain('require(WPATH(\'button\'))');
		expect(result.code).not.toContain('function WPATH(s)');
		expect(result.code).not.toContain('require(\'/alloy/widget\')');
	});

	it('should reject dynamic authored Alloy create calls in ESM mode', () => {
		expect.assertions(1);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const controllerPath = resolveComponentPath('controllers', 'index.js');
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		try {
			expect(() => compiler.compileComponent({
				file: controllerPath,
				controllerContent: `
const name = 'child';
const child = Alloy.createController(name);
`,
			})).toThrow('Alloy.createController(name) is not statically loadable in Alloy ESM mode.');
		} finally {
			errorSpy.mockRestore();
		}
	});

	it('should compile ESM model definitions as ESM', () => {
		expect.assertions(4);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const modelPath = resolveComponentPath('models', 'book.js');
		const result = compiler.compileModel({
			file: modelPath,
			content: fs.readFileSync(modelPath, 'utf-8')
		});

		expect(result.code).not.toContain('const exports =');
		expect(result.code).toContain('export const definition = {');
		expect(result.code).toContain('export const Model = Alloy.M(\'book\',\n\tdefinition,');
		expect(result.code).toContain('export const Collection = Alloy.C(\'book\',\n\tdefinition,');
	});

	it('should compile standalone ESM model imports without model metadata', () => {
		expect.assertions(1);
		const compiler = setupCompiler({ moduleFormat: 'esm' });
		const modelPath = resolveComponentPath('models', 'standalone.js');
		const result = compiler.compileModel({
			file: modelPath,
			content: 'export const definition = { config: {} };'
		});

		expect(result.code).toContain('export const Model = Alloy.M(\'standalone\',');
	});
});
