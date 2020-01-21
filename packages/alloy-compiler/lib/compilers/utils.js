function configureBabelPlugins(compileConfig) {
	return [
		[ require('../ast/builtins-plugin'), compileConfig ],
		[ require('../ast/handle-alloy-globals') ],
		[ require('../ast/optimizer-plugin'), compileConfig.alloyConfig ],
	];
}

module.exports = {
	configureBabelPlugins
};
