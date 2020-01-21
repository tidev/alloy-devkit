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
};
