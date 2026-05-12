var U = require('alloy-utils').utils,
	_ = require('lodash');

var LOCALE_REGEX = /^\s*(?:L|Ti\.Locale\.getString|Titanium\.Locale\.getString)\(.+\)\s*$/;

exports.parse = function (node, state) {
	return require('./base').parse(node, state, parse);
};

function parse(node, state, args) {
	if (!state.itemsArray) {
		U.die('Invalid use of <Option>. Must be the child of <Options>.');
	}

	var string = U.trim(U.XML.getNodeText(node) || '');
	if (!LOCALE_REGEX.test(string)) {
		string = '"' + string.replace(/"/g, '\\"') + '"';
	}

	const codePush = `${state.itemsArray}.push(${string})`;
	const attrName = _.findKey(state.extraOptions, (varName, name) => args.createArgs[name] !== undefined);
	const attrVarName = state.extraOptions[attrName];

	let code = codePush;

	// DEVKIT DELTA: emit `const` declarations to avoid implicit-global assignment
	// in strict mode. See docs/DEVKIT_DELTAS.md item 3.
	if (attrName) {
		if (args.createArgs[attrName]) {
			code = `const ${attrVarName} = ${codePush} - 1`;
		} else {
			code = `const ${attrVarName} = undefined; ${codePush}`;
		}
	}

	return {
		parent: {},
		styles: state.styles,
		code: `${code};`
	};
}
