const { utils: U } = require('alloy-utils');
const babel = require('@babel/core');

const AlloyCompiler = require('./alloy');
const { configureBabelPlugins } = require('./utils');

module.exports = class StandaloneCompiler extends AlloyCompiler {
	compileComponent(options) {
		const result = super.compileComponent(options);
		const babelOptions = {
			babelrc: false,
			retainLines: true,
			plugins: configureBabelPlugins(this.config),
			inputSourceMap: result.map
		};
		try {
			result.code = babel.transformSync(result.code, babelOptions).code;
		} catch (e) {
			U.die('Error transforming JS file', e);
		}

		return result;
	}
};