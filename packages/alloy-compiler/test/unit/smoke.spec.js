const { setupCompilerFactory, resolveComponentPath } = require('./utils');

describe('smoke: end-to-end compile of test-app fixture', () => {
	const factory = setupCompilerFactory();

	it('compiles the index component end-to-end', () => {
		expect.assertions(1);

		const componentCompiler = factory.createCompiler('component');
		const result = componentCompiler.compile({
			file: resolveComponentPath('controllers', 'index.js')
		});

		expect(result.code).toMatchSnapshot('component');
	});
});
