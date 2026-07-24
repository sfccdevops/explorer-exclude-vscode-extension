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
async function activate(context) {
  // Initialize Localization
  init(context.extensionPath)

  // Save Extension Context for later use
  util.saveContext(context)

  const timeout = 25
  const pane = new ViewPane('explorerExclude.pane.items')
  const refreshPane = () => pane.update(util.getAllExcludes())
  const getModeId = (node) => (node && node.mode ? node.mode : 'files')

  // Get Extension Version Info
  const currentVersion = context.globalState.get('explorer-exclude.version')
  const packageVersion = require('../package.json').version

  await util.migrateLegacySettings()
  await util.initializeState()

  // Check if there was a recent change to installed version
  if (currentVersion !== packageVersion) {
    // Update version number so we don't show this again until next update
    context.globalState.update('explorer-exclude.version', packageVersion)

    // Show Welcome Modal since this is a new version or install
    const welcome = new WelcomePane()
    welcome.show()
  }

  const disableAll = vscode.commands.registerCommand('explorer-exclude.disableAll', (node) => {
    util.logger('Disable All Excludes', 'debug')
    util.disableAll(function () {
      setTimeout(function () {
        refreshPane()
      }, timeout)
    }, getModeId(node))
  })

  const enableAll = vscode.commands.registerCommand('explorer-exclude.enableAll', (node) => {
    util.logger('Enable All Excludes', 'debug')
    util.enableAll(function () {
      setTimeout(function () {
        refreshPane()
      }, timeout)
    }, getModeId(node))
  })

  const exclude = vscode.commands.registerCommand('explorer-exclude.exclude', (uri) => {
    util.exclude(
      uri,
      function () {
        setTimeout(function () {
          refreshPane()
        }, timeout)
      },
      'files'
    )
  })

  const addToExcludes = vscode.commands.registerCommand('explorer-exclude.addToExcludes', async (uri) => {
    const modeId = await util.chooseMode()
    if (!modeId) {
      return
    }

    util.exclude(
      uri,
      function () {
        setTimeout(function () {
          refreshPane()
        }, timeout)
      },
      modeId
    )
  })

  const openSettings = vscode.commands.registerCommand('explorer-exclude.openSettings', (node) => {
    util.logger('Opening Explorer Exclude Settings', 'debug')
    const mode = util.getMode(getModeId(node))
    vscode.commands.executeCommand('workbench.action.openSettings', mode.settingKey)
    setTimeout(function () {
      vscode.commands.executeCommand('workbench.action.openWorkspaceSettings')
    }, 1000)
  })

  const remove = vscode.commands.registerCommand('explorer-exclude.remove', (uri) => {
    if (uri && uri.value) {
      const value = uri.value
      const key = uri.key || value.substring(0, value.length - 2)

      util.logger(`Remove: ${key}`, 'debug')

      util.deleteExclude(
        key,
        function () {
          setTimeout(function () {
            refreshPane()
          }, timeout)
        },
        uri.mode || 'files'
      )
    }
  })

  const reset = vscode.commands.registerCommand('explorer-exclude.reset', async (node) => {
    const modeId = getModeId(node)
    const mode = util.getMode(modeId)
    const value = await vscode.window.showInputBox({
      prompt: localize('reset.prompt', localize(mode.labelKey)),
    })

    if (typeof value !== 'undefined') {
      util.logger('Reset Explorer Exclude', 'debug')

      util.reset(function () {
        setTimeout(function () {
          refreshPane()
        }, timeout)
      }, modeId)
    }
  })

  const toggle = vscode.commands.registerCommand('explorer-exclude.toggle', (uri) => {
    util.toggleExclude(uri, function () {
      setTimeout(function () {
        refreshPane()
      }, timeout)
    })
  })

  const toggleGroupExpansion = vscode.commands.registerCommand('explorer-exclude.toggleGroupExpansion', (node) => {
    pane.toggleGroupExpansion(getModeId(node))
  })

  const toggleAllOff = vscode.commands.registerCommand('explorer-exclude.toggleAllOff', (node) => {
    util.logger('Toggle All Excludes: OFF', 'debug')
    util.toggleAll(function () {
      setTimeout(function () {
        refreshPane()
      }, timeout)
    }, getModeId(node))
  })

  const toggleAllOn = vscode.commands.registerCommand('explorer-exclude.toggleAllOn', (node) => {
    util.logger('Toggle All Excludes: ON', 'debug')
    util.toggleAll(function () {
      setTimeout(function () {
        refreshPane()
      }, timeout)
    }, getModeId(node))
  })

  // Set Initial State of Extension
  vscode.commands.executeCommand('setContext', 'explorer-exclude.hasLoaded', true)

  // Initialize Hidden Items Pane
  refreshPane()

  // Update VS Code Extension Subscriptions
  context.subscriptions.push(disableAll)
  context.subscriptions.push(enableAll)
  context.subscriptions.push(exclude)
  context.subscriptions.push(addToExcludes)
  context.subscriptions.push(openSettings)
  context.subscriptions.push(remove)
  context.subscriptions.push(reset)
  context.subscriptions.push(toggle)
  context.subscriptions.push(toggleGroupExpansion)
  context.subscriptions.push(toggleAllOff)
  context.subscriptions.push(toggleAllOn)
}

/**
 * Handle Deactivating Extension
 */
function deactivate() {
  vscode.commands.executeCommand('setContext', 'explorer-exclude.enabled', false)
}

module.exports = {
  activate,
  deactivate,
}
