const vscode = require('vscode');
const { init, localize } = require('vscode-nls-i18n');

const util = require('./util');
const ViewPane = require('./viewpane');
const WelcomePane = require('./welcome');

function activate(context) {
	init(context);

	const timeout = 25;
	const pane = new ViewPane('explorerExclude.pane.items');

	/* Get Extension Version Info */
	const currentVersion = context.globalState.get('explorer-exclude.version');
	const packageVersion = vscode.extensions.getExtension('SFCCDevOps.explorer-exclude-vscode-extension').packageJSON.version;

	/* Initialize Hidden Items Pane */
	pane.update(util.getExcludes());

	/* Save Extension Context for later use */
	util.saveContext(context);

	/* Set Initial State of Extension */
	vscode.commands.executeCommand('setContext', 'explorerExclude:enabled', true);

	/* Check if there was a recent change to installed version */
	if (currentVersion !== packageVersion) {
		context.globalState.update('explorer-exclude.version', packageVersion);

		const welcome = new WelcomePane();
		welcome.show();
	}

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

	const toggleAllOff = vscode.commands.registerCommand('explorer-exclude.toggleAllOff', () => {
		util.vscToggleAll(function() {
			setTimeout(function(){
				pane.update(util.getExcludes());
			}, timeout);
		});
	});

	const toggleAllOn = vscode.commands.registerCommand('explorer-exclude.toggleAllOn', () => {
		util.vscToggleAll(function() {
			setTimeout(function(){
				pane.update(util.getExcludes());
			}, timeout);
		});
	});

	const disableAll = vscode.commands.registerCommand('explorer-exclude.disableAll', () => {
		util.vscDisableAll(function() {
			setTimeout(function(){
				pane.update(util.getExcludes());
			}, timeout);
		});
	});

	const enableAll = vscode.commands.registerCommand('explorer-exclude.enableAll', () => {
		util.vscEnableAll(function() {
			setTimeout(function(){
				pane.update(util.getExcludes());
			}, timeout);
		});
	});

	const reset = vscode.commands.registerCommand('explorer-exclude.reset',async () => {
		const value = await vscode.window.showInputBox({
			prompt: localize('reset.prompt')
		});

		if (typeof value !== 'undefined') {
			util.vscReset(function() {
				setTimeout(function(){
					pane.update(util.getExcludes());
				}, timeout);
			});
		}
	});

	context.subscriptions.push(exclude);
	context.subscriptions.push(remove);
	context.subscriptions.push(toggle);
	context.subscriptions.push(toggleAllOff);
	context.subscriptions.push(toggleAllOn);
	context.subscriptions.push(disableAll);
	context.subscriptions.push(enableAll);
	context.subscriptions.push(reset);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
