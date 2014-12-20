module.exports = {
	id: 'appStart',
	isMain: true,
	import: [{
		id: 'services.messageService',
		as: 'messageService'
	}],
	init: init
};

function init(imports) {
	console.log('appstart! ', imports);
	var messageService = imports.messageService;

	console.log('result of calling messageService.something: ', messageService.something());

	return true;
}