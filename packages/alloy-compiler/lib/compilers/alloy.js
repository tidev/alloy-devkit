const { tiapp } = require('alloy-utils');
const fs = require('fs');
const path = require('path');

const CompilerFactory = require('./factory');
const CompilationMeta = require('./meta');
const styler = require('../styler');

/**
 * @typedef {Object} AlloyConfig
 * @property {stirng} platform Target build platform
 * @property {string} deploytype Deployment type (development, test or production)
 * @property {string=} file File to compile
 */

/**
 * @typedef {Object} CompileConfig
 * @property {AlloyConfig} alloyConfig
 * @property {Object} dir
 * @property {Object} buildLog
 * @property {string} [theme=undefined]
 * @property {boolean} [sourcemap=true]
 * @property {boolean} [autoStyle=false]
 */

/**
 * @typedef {Object} CompilerOptions
 * @property {CompileConfig} compileConfig Compile config from compilerUtils
 * @property {fs} fs Compiler file system to use
 * @property {boolean} [webpack=false] Whether or not the compiler is used withing Webpack
 */

/**
 * Alloy compiler facade.
 */
class AlloyCompiler {
	/**
	 * Constructs a new alloy compiler.
	 *
	 * @param {CompilerOptions} options Compiler options.
	 */
	constructor(options) {
		const { compileConfig } = options;
		if (!options.fs) {
			options.fs = fs;
		}
		const compilationMeta = new CompilationMeta(options);
		this.compilationMeta = compilationMeta;
		this.config = compileConfig;
		this.factory = new CompilerFactory({ ...options, compilationMeta });

		// This needs to be initialized before any compile command
		tiapp.init(path.join(compileConfig.dir.project, 'tiapp.xml'));
		// validate the current Titanium SDK version, exit on failure
		tiapp.validateSdkVersion();

		// Load global styles
		styler.setPlatform(compileConfig.alloyConfig.platform);
		const theme = options.compileConfig.theme;
		styler.loadGlobalStyles(compileConfig.dir.home, theme ? { theme } : {});
	}

	compileComponent(options) {
		const compiler = this.factory.createCompiler('component');
		return compiler.compile(options);
	}

	compileModel(options) {
		const compiler = this.factory.createCompiler('model');
		return compiler.compile(options);
	}

	compileStyle(options) {
		const compiler = this.factory.createCompiler('style');
		return compiler.compile(options);
	}
}

module.exports = AlloyCompiler;
