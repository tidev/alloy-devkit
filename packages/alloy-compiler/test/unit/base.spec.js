const { setupCompiler, resolveComponentPath } = require('./utils');

describe('base compiler', () => {
	describe('findWidget', () => {
		it('should find widget for widget controller', () => {
			expect.assertions(2);
			const compilerFacade = setupCompiler();
			const compiler = compilerFacade.factory.createCompiler('component');
			let componentPath = resolveComponentPath('widgets/com.appc.grid/controllers', 'widget.js');
			let widget = compiler.findWidget(componentPath);
			expect(widget.manifest.id).toEqual('com.appc.grid');
			componentPath = resolveComponentPath('widgets/com.appc.gridControls/controllers', 'widget.js');
			widget = compiler.findWidget(componentPath);
			expect(widget.manifest.id).toEqual('com.appc.gridControls');
		});
	});
});
