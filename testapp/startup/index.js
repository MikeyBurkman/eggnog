module.exports = {
	id: 'appStart',
	deps: [{
		id: 'services.messageService',
		as: 'messageService'
	}],
	init: init
};

function init(deps) {
	console.log('appstart! ', deps);
	var messageService = deps.messageService;

	console.log('result of calling messageService.something: ', messageService.something());

	return true;
}