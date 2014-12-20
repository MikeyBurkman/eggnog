module.exports = {
	deps: ['services.threadService'],
	init: init
};

function init(deps) {
	var threadService = deps['services.threadService'];
	console.log('message service! ', deps);

	return {
		something: function() {
			console.log('Calling messageService.something');
			return threadService.stuff;
		}
	};
}