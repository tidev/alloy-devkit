const path = require('path');

const { createCompiler } = require('../../lib');
const { logger } = require('alloy-utils');

logger.logLevel = logger.ERROR;

function setupCompiler(options) {
	return createCompiler(Object.assign({}, {
		projectDir: path.join(__dirname, 'fixtures', 'test-app'),
		alloyConfig: {
			platform: 'ios'
		}
	}, options));
}

function resolveComponentPath(type, filename) {
	return path.join(__dirname, 'fixtures', 'test-app', 'app', type, filename);
}

module.exports = {
  setupCompiler,
  resolveComponentPath
};
