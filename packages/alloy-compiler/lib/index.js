const path = require('path');

const BuildLog = require('./build-log');
const utils = require('./utils');
const sourceMapper = require('./compiler/sourceMapper');
const StandaloneCompiler = require('./compiler/standalone');
const { configureBabelPlugins } = require('./compiler/utils');
const WebpackCompiler = require('./compiler/webpack');

function createCompileConfig(options) {
	const { projectDir } = options;
	const appDir = path.join(projectDir, 'app');
	const buildLog = options.buildLog || new BuildLog(projectDir);
	const alloyConfig = options.alloyConfig;
	return utils.createCompileConfig(appDir, projectDir, alloyConfig, buildLog);
}

function createCompiler(options) {
	const compileConfig = options.compileConfig || createCompileConfig(options);
	if (options.webpack) {
		return new WebpackCompiler({
			compileConfig
		});
	} else {
		return new StandaloneCompiler({
			compileConfig
		});
	}
}

module.exports = {
	BuildLog,
	configureBabelPlugins,
	createCompileConfig,
	createCompiler,
	sourceMapper,
	utils
};
