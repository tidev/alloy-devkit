// eslint-disable: quotes
// eslint-disable: max-len

const { setupCompilerFactory, resolveComponentPath } = require('./utils');

const factory = setupCompilerFactory();

describe('style compiler', () => {
	it('should compile style correctly', () => {
		expect.assertions(1);
		const compiler = factory.createCompiler('style');
		const { code } = compiler.compile({
			file: resolveComponentPath('styles', 'index.tss')
		});
		expect(code).toMatchInlineSnapshot(
			'"module.exports = [{\\"style\\":{color:\\"#000\\",font:{fontSize:\\"18dp\\",fontWeight:\\"bold\\",},height:Ti.UI.SIZE,width:Ti.UI.SIZE,}},{\\"style\\":{backgroundColor:\\"#fff\\",fullscreen:false,exitOnClose:true,}}];"'
		);
	});
});
