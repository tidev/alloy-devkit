const AlloyCompiler = require('./alloy');

/** @typedef {import("./alloy").CompilerOptions} CompilerOptions */

module.exports = class WebpackCompiler extends AlloyCompiler {
	/**
	 * @param {CompilerOptions} options Compiler options
	 */
	constructor(options) {
		options.webpack = true;
		super(options);
	}
	compileComponent(options) {
		const result = super.compileComponent(options);
		// replace final module.exports with ES6 export to support both
		// import and require in user controllers.
		// https://github.com/webpack/webpack/issues/4039
		result.code = result.code.replace('module.exports = ', 'export default ');

		return result;
	}
};
