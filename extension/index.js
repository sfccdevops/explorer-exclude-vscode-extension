'use strict'

const vscode = require('vscode')
const { init, localize } = require('vscode-nls-i18n')

const util = require('./util')
const ViewPane = require('./viewpane')
const WelcomePane = require('./welcome')

/**
 * Handle Activating Extension
 * @param {*} context
 */
function activate(context) {
  // Initialize Localization
  init(context.extensionPath)

  const timeout = 25
  const pane = new ViewPane('explorerExclude.pane.items')

  // Get Extension Version Info
  const currentVersion = context.globalState.get('explorer-exclude.version')
  const packageVersion = vscode.extensions.getExtension('SFCCDevOps.explorer-exclude-vscode-extension').packageJSON.version

  // Check if there was a recent change to installed version
  if (currentVersion !== packageVersion) {
    // Update version number so we don't show this again until next update
    context.globalState.update('explorer-exclude.version', packageVersion)

    // Show Welcome Modal since this is a new version or install
    const welcome = new WelcomePane()
    welcome.show()
  }

  const disableAll = vscode.commands.registerCommand('explorer-exclude.disableAll', () => {
    util.logger('Disable All Excludes', 'debug')
    util.disableAll(function () {
      setTimeout(function () {
        pane.update(util.getExcludes())
      }, timeout)
    })
  })

  const enableAll = vscode.commands.registerCommand('explorer-exclude.enableAll', () => {
    util.logger('Enable All Excludes', 'debug')
    util.enableAll(function () {
      setTimeout(function () {
        pane.update(util.getExcludes())
      }, timeout)
    })
  })

  const exclude = vscode.commands.registerCommand('explorer-exclude.exclude', (uri) => {
    util.exclude(uri, function () {
      setTimeout(function () {
        pane.update(util.getExcludes())
      }, timeout)
    })
  })

  const openSettings = vscode.commands.registerCommand('explorer-exclude.openSettings', () => {
    util.logger('Opening Explorer Exclude Settings', 'debug')
    vscode.commands.executeCommand('workbench.action.openSettings', 'explorerExclude.')
    setTimeout(function () {
      vscode.commands.executeCommand('workbench.action.openWorkspaceSettings')
    }, 1000)
  })

  const remove = vscode.commands.registerCommand('explorer-exclude.remove', (uri) => {
    util.logger(`Remove: ${uri}`, 'debug')
    if (uri && uri.value) {
      const value = uri.value
      const key = value.substring(0, value.length - 2)

      util.deleteExclude(key, function () {
        setTimeout(function () {
          pane.update(util.getExcludes())
        }, timeout)
      })
    }
  })

  const reset = vscode.commands.registerCommand('explorer-exclude.reset', async () => {
    const value = await vscode.window.showInputBox({
      prompt: localize('reset.prompt'),
    })

    if (typeof value !== 'undefined') {
      util.logger('Reset Explorer Exclude', 'debug')

      util.reset(function () {
        setTimeout(function () {
          pane.update(util.getExcludes())
        }, timeout)
      })
    }
  })

  const toggle = vscode.commands.registerCommand('explorer-exclude.toggle', (uri) => {
    util.toggleExclude(uri, function () {
      setTimeout(function () {
        pane.update(util.getExcludes())
      }, timeout)
    })
  })

  const toggleAllOff = vscode.commands.registerCommand('explorer-exclude.toggleAllOff', () => {
    util.logger('Toggle All Excludes: OFF', 'debug')
    util.toggleAll(function () {
      setTimeout(function () {
        pane.update(util.getExcludes())
      }, timeout)
    })
  })

  const toggleAllOn = vscode.commands.registerCommand('explorer-exclude.toggleAllOn', () => {
    util.logger('Toggle All Excludes: ON', 'debug')
    util.toggleAll(function () {
      setTimeout(function () {
        pane.update(util.getExcludes())
      }, timeout)
    })
  })

  // Set Initial State of Extension
  vscode.commands.executeCommand('setContext', 'explorer-exclude.enabled', true)

  // Save Extension Context for later use
  util.saveContext(context)

  // Initialize Hidden Items Pane
  pane.update(util.getExcludes())

  // Update VS Code Extension Subscriptions
  context.subscriptions.push(disableAll)
  context.subscriptions.push(enableAll)
  context.subscriptions.push(exclude)
  context.subscriptions.push(openSettings)
  context.subscriptions.push(remove)
  context.subscriptions.push(reset)
  context.subscriptions.push(toggle)
  context.subscriptions.push(toggleAllOff)
  context.subscriptions.push(toggleAllOn)
}

/**
 * Handle Deactivating Extension
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
