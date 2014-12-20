module.exports = {
	dependencies: [],
	init: init
};

function init(deps) {
	console.log('thread service! ', deps);
	return {
		stuff: 'This is some stuff!'
	};
}