module.exports = {
	import: [],
	init: init
};

function init(imports) {
	console.log('thread service! ', imports);
	return {
		stuff: 'This is some stuff!'
	};
}