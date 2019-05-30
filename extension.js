const vscode = require('vscode');
const { init } = require('vscode-nls-i18n');

const util = require('./util');
const ViewPane = require('./viewpane');

function activate(context) {
	init(context);

	const timeout = 25;
	const pane = new ViewPane('explorerExclude.pane.items');

	pane.update(util.getExcludes());
	util.saveContext(context);

	const exclude = vscode.commands.registerCommand('explorer-exclude.exclude', (uri) => {
		util.vscExclude(uri, function() {
			setTimeout(function(){
				pane.update(util.getExcludes());
			}, timeout);
		});
	});

	const remove = vscode.commands.registerCommand('explorer-exclude.remove', (uri) => {
		util.vscRemove(uri, function() {
			setTimeout(function(){
				pane.update(util.getExcludes());
			}, timeout);
		});
	});

	const toggle = vscode.commands.registerCommand('explorer-exclude.toggle', (uri) => {
		util.vscToggle(uri, function() {
			setTimeout(function(){
				pane.update(util.getExcludes());
			}, timeout);
		});
	});

	context.subscriptions.push(exclude);
	context.subscriptions.push(remove);
	context.subscriptions.push(toggle);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
