module.exports = {
	deps: [{
		id: 'services.threadService',
		as: 'threadService'
	}],
	init: init
};

function init(deps) {
	var threadService = deps.threadService;
	console.log('message service! ', deps);

	return {
		something: function() {
			console.log('Calling messageService.something');
			return threadService.stuff;
		}
	};
}