const _ = require('lodash');
const { tiapp, utils: U } = require('alloy-utils');
const MIN_VERSION = '10.0.0';

exports.parse = function (node, state) {
	const tiappSdkVersion = tiapp.getSdkVersion();
	if (tiapp.version.lt(tiappSdkVersion, MIN_VERSION)) {
		U.die(`Ti.UI.OptionBar requires Titanium SDK ${MIN_VERSION}+`);
	}
	return require('./Ti.UI.ButtonBar').parse(node, state);
};
