const BaseCompiler = require('./base');

module.exports = class WebpackCompiler extends BaseCompiler {
	compileComponent(options) {
		const result = super.compileComponent(options);
    // replace final module.exports with ES6 export to support both
    // import and require in user controllers.
    // https://github.com/webpack/webpack/issues/4039
    result.code = result.code.replace('module.exports = ', 'export default ')

		return result;
	}
};
