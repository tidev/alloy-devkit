// eslint-disable: quotes
// eslint-disable: max-len

const { setupCompiler, resolveComponentPath } = require('./utils');

describe('base compiler', () => {
	it('should compile view correctly', () => {
		expect.assertions(2);

		const compiler = setupCompiler();
		const result = compiler.compileView({
			file: resolveComponentPath('views', 'index.xml')
		});

		expect(result.viewCode).toMatchInlineSnapshot(`
		"$.__views[\\"index\\"] = Ti.UI.createWindow(
		{backgroundColor:\\"#fff\\",fullscreen:false,exitOnClose:true,id:\\"index\\",}
		);
		$.__views[\\"index\\"] && $.addTopLevelView($.__views[\\"index\\"]);
		$.__views[\\"label\\"] = Ti.UI.createLabel(
		{color:\\"#000\\",font:{fontSize:\\"18dp\\",fontWeight:\\"bold\\",},height:Ti.UI.SIZE,width:Ti.UI.SIZE,text:'Hello, World!',id:\\"label\\",}
		);
		$.__views[\\"index\\"].add($.__views[\\"label\\"]);
		sayHello?$.addListener($.__views[\\"label\\"],'click',sayHello):__defers['$.__views[\\"label\\"]!click!sayHello']=true;exports.destroy = function () {};"
	`);
		expect(result.postCode).toMatchInlineSnapshot(
			`"__defers['$.__views[\\"label\\"]!click!sayHello'] && $.addListener($.__views[\\"label\\"],'click',sayHello);"`
		);
	});

	it('should compile style correctly', () => {
		expect.assertions(1);
		const compiler = setupCompiler();
		const { code } = compiler.compileStyle({
			file: resolveComponentPath('styles', 'index.tss')
		});
		expect(code).toMatchInlineSnapshot(
			`"module.exports = [{\\"style\\":{color:\\"#000\\",font:{fontSize:\\"18dp\\",fontWeight:\\"bold\\",},height:Ti.UI.SIZE,width:Ti.UI.SIZE,}},{\\"style\\":{backgroundColor:\\"#fff\\",fullscreen:false,exitOnClose:true,}}];"`
		);
	});
});
