const { logger } = require('alloy-utils');
const path = require('path');

const BuildLog = require('./build-log');
const utils = require('./compilerUtils');
const sourceMapper = require('./sourceMapper');
const StandaloneCompiler = require('./compilers/standalone');
const { configureBabelPlugins } = require('./compilers/utils');
const WebpackCompiler = require('./compilers/webpack');

function createCompileConfig(options) {
	const { projectDir } = options;
	const appDir = path.join(projectDir, 'app');
	logger.logLevel = options.logLevel || logger.ERROR;
	const buildLog = options.buildLog || new BuildLog(projectDir);
	const alloyConfig = options.alloyConfig;
	return utils.createCompileConfig(appDir, projectDir, alloyConfig, buildLog);
}

function createCompiler(options) {
	const compileConfig = options.compileConfig || createCompileConfig(options);
	if (options.webpack) {
		return new WebpackCompiler({
			...options,
			compileConfig
		});
	} else {
		return new StandaloneCompiler({
			...options,
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
