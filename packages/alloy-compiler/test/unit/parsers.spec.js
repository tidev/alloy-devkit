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

	it('compiles a view using wave-1 tags without error', () => {
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
