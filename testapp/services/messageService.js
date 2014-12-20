module.exports = {
	import: [{
		id: 'services.threadService',
		as: 'threadService'
	}],
	init: init
};

function init(imports) {
	var threadService = imports.threadService;
	console.log('message service! ', imports);

	return {
		something: function() {
			console.log('Calling messageService.something');
			return threadService.stuff;
		}
	};
}