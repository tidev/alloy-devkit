exports.parse = function (node, state) {
	return require('./base').parse(node, state, parse);
};

function parse(node, state) {
	return require('./default').parse(node, state);
}
