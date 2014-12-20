module.exports = {
	id: 'appStart',
	deps: ['messageService'],
	init: init
};

function init(deps) {
	console.log('appstart! ', deps);
	var messageService = deps.messageService;

	console.log('result of calling messageService.something: ', messageService.something());
}