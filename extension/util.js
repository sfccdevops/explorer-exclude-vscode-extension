'use strict'

const fs = require('fs')
const path = require('path')
const vscode = require('vscode')
const excludeConfig = require('./exclude-config')

const { init, localize } = require('vscode-nls-i18n')

// Create custom Output Channel to Log Helpful Messages
const output = vscode.window.createOutputChannel('Explorer Exclude')

// Setup Workspace Variables
let workspace = vscode.workspace.rootPath
let context = null

/**
 * Custom Await Method for Processing Hidden File Config
 */
const _await =
  (this && this._await) ||
  function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value))
        } catch (err) {
          reject(err)
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value))
        } catch (err) {
          reject(err)
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : new P(function (resolve) {
              resolve(result.value)
            }).then(fulfilled, rejected)
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next())
    })
  }

/**
 * Get VS Code Workspace Base
 * @param {*} context
 * @returns
 */
const getWorkspace = (context) => {
  // Initialize Localization
  init(context.extensionPath)

  let root
  let workspace

  // Check for missing VS Code Workspace, if present, otherwise use context path
  if (context && !vscode.workspace && !vscode.workspace.workspaceFolders) {
    workspace = vscode.workspace.rootPath ? vscode.workspace.rootPath : path.dirname(context.fsPath)
  } else {
    // We have a Workspace, now let's figure out if it's single or multiroot
    if (vscode.workspace && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
      // There was only one Workspace, so we can just use it
      root = vscode.workspace.workspaceFolders[0]
      workspace = root && root.uri ? root.uri.fsPath : null
    } else if (vscode.workspace && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
      // There is more than one Workspace, so let's grab the active one
      if (vscode.window.activeTextEditor) {
        // Since there is a file active, let's find the workspace from that file
        root = vscode.workspace.workspaceFolders.find((wsFolder) => {
          const relative = path.relative(wsFolder.uri.fsPath, vscode.window.activeTextEditor.document.uri.path)
          return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
        })

        // The file that is active does not belong to any of the workspace folders, so let's use the first workspace
        if (!root) {
          root = vscode.workspace.workspaceFolders[0]
        }

        workspace = root && root.uri ? root.uri.fsPath : null
      } else {
        // No file was open, so just grab the first available workspace
        root = vscode.workspace.workspaceFolders[0]
        workspace = root && root.uri ? root.uri.fsPath : null
      }
    } else if (context && vscode.workspace) {
      // Something else is going on, let's see if we can still figure it out
      try {
        root = vscode.workspace.getWorkspaceFolder(context)
        workspace = root && root.uri ? root.uri.fsPath : null
      } catch (err) {
        logger(localize('debug.logger.error', 'getWorkspace:fetch', err.toString()), 'error')
      }
    }
  }

  // If we did not get Workspace, let the user know
  if (!workspace) {
    const message = localize('debug.logger.missingWorkspace')
    logger(localize('debug.logger.error', 'getWorkspace', message), 'error')

    vscode.commands.executeCommand('setContext', 'explorer-exclude.missingWorkspace', true)
    vscode.commands.executeCommand('setContext', 'explorer-exclude.hasLoaded', true)
  }

  // Debug Cartridge Path
  logger(localize('debug.logger.workspace', workspace))

  return workspace
}

/**
 * Check if Path Exists
 * @param {string} _path
 */
const ifExists = (_path) => {
  if (isUnavailable(_path)) {
    return Promise.reject(new Error(localize('error.ifExists', _path)))
  }
  return new Promise((res, rej) => {
    fs.access(_path, (error) => {
      if (error === null || typeof error === 'undefined') {
        res(true)
      } else {
        rej(error)
      }
    })
  })
}

/**
 * Check if path is defined
 * @param {string} _path
 */
const isUnavailable = (_path) => {
  return _path === null || typeof _path === 'undefined' || _path === ''
}

/**
 * Parse File Path
 * @param {string} _file
 * @param {string} _root
 */
const parseFilePath = (_file, _root = '') => {
  return _await(this, void 0, void 0, function* () {
    if (isUnavailable(_file)) {
      return Promise.reject(new Error(localize('error.parseFilePath', _file)))
    }

    try {
      yield ifExists(_file)

      const ext = path.extname(_file)
      const base = path.basename(_file)
      const dir = path.relative(_root, path.dirname(_file))

      return {
        path: _file,
        ext,
        base,
        dir,
      }
    } catch (err) {
      logger(localize('debug.logger.error', 'parseFilePath', err.toString()), 'error')
      return Promise.reject(err)
    }
  })
}

/**
 * Show Item Select Menu
 * @param {array} items
 */
const showPicker = (items) => {
  return vscode.window.showQuickPick(items, {
    placeHolder: localize('picker.placeholder'),
    canPickMany: true,
  })
}

/**
 * Write Exclude Updates to Config File
 * @param {object} excludes
 * @param {function} callback
 * @param {string} message
 */
const getWorkspaceExcludes = (modeId = 'files') => {
  const mode = excludeConfig.getMode(modeId)
  const inspection = vscode.workspace.getConfiguration().inspect(mode.settingKey)
  return (inspection && inspection.workspaceValue) || {}
}

const getGlobalExcludes = (modeId = 'files') => {
  const mode = excludeConfig.getMode(modeId)
  const inspection = vscode.workspace.getConfiguration().inspect(mode.settingKey)
  return excludeConfig.mergeExcludes(inspection && inspection.defaultValue, inspection && inspection.globalValue)
}

const getEffectiveExcludes = (modeId = 'files') => excludeConfig.mergeExcludes(getGlobalExcludes(modeId), getWorkspaceExcludes(modeId))

const getState = (key, defaultValue) => (context && context.workspaceState ? context.workspaceState.get(key, defaultValue) : defaultValue)

const setState = (key, value) => (context && context.workspaceState ? context.workspaceState.update(key, value) : Promise.resolve())

const getBackup = (modeId) => getState(excludeConfig.getMode(modeId).backupKey, {})

const setBackup = (modeId, backup) => setState(excludeConfig.getMode(modeId).backupKey, backup)

const getDisabledValues = (modeId) => getState(excludeConfig.getMode(modeId).disabledValuesKey, {})

const setDisabledValues = (modeId, disabledValues) => setState(excludeConfig.getMode(modeId).disabledValuesKey, disabledValues)

const getManagedOverrides = (modeId) => getState(`${excludeConfig.getMode(modeId).backupKey}.managedOverrides`, {})

const setManagedOverrides = (modeId, overrides) => setState(`${excludeConfig.getMode(modeId).backupKey}.managedOverrides`, overrides)

async function initializeState() {
  if (!context || !context.workspaceState) {
    return
  }

  const filesMode = excludeConfig.getMode('files')
  if (context.workspaceState.get(filesMode.backupKey) === undefined) {
    const inspection = vscode.workspace.getConfiguration().inspect('explorerExclude.backup')
    const legacyBackup = inspection && inspection.workspaceValue
    if (legacyBackup && Object.keys(legacyBackup).length > 0) {
      await setBackup(filesMode.id, legacyBackup)
    }
  }
}

const updateConfig = async (modeId, excludes, callback, message, clearBackup = false) => {
  try {
    const mode = excludeConfig.getMode(modeId)
    await vscode.workspace.getConfiguration().update(mode.settingKey, excludes, vscode.ConfigurationTarget.Workspace)

    if (clearBackup) {
      await setBackup(mode.id, {})
    }

    if (message) {
      vscode.window.showInformationMessage(message)
    }

    if (typeof callback === 'function') {
      callback()
    }

    return true
  } catch (err) {
    logger(localize('debug.logger.error', 'updateConfig', err.toString()), 'error')
    vscode.window.showErrorMessage(err.message || err)
    return false
  }
}

const updateWorkspaceConfig = async (modeId, currentExcludes, nextExcludes, callback, message) => {
  const managedOverrides = Object.assign({}, getManagedOverrides(modeId))
  const changedKeys = new Set([...Object.keys(currentExcludes), ...Object.keys(nextExcludes)])

  changedKeys.forEach((key) => {
    if (excludeConfig.valuesMatch(currentExcludes[key], nextExcludes[key])) {
      return
    }

    if (!Object.prototype.hasOwnProperty.call(managedOverrides, key)) {
      managedOverrides[key] = {
        hasValue: Object.prototype.hasOwnProperty.call(currentExcludes, key),
        value: currentExcludes[key],
      }
    }
  })

  const updated = await updateConfig(modeId, nextExcludes, callback, message)
  if (updated) {
    await setManagedOverrides(modeId, managedOverrides)
  }
  return updated
}

/**
 * Delete Key from Exclude Config
 * @param {string} key
 * @param {function} callback
 */
function deleteExclude(key, callback, modeId = 'files') {
  if (!key) {
    return false
  }

  const excludes = getWorkspaceExcludes(modeId)

  // Remove if already set
  if (key && Object.prototype.hasOwnProperty.call(excludes, key)) {
    const newExcludes = excludeConfig.removePattern(excludes, key)
    const disabledValues = getDisabledValues(modeId)
    delete disabledValues[key]
    setDisabledValues(modeId, disabledValues).then(() => updateWorkspaceConfig(modeId, excludes, newExcludes, callback, localize('config.removedKey', key)))
  }
}

/**
 * Disable All
 * @param {function} callback
 */
function disableAll(callback, modeId = 'files') {
  const existingBackup = getBackup(modeId)
  if (Object.keys(existingBackup).length > 0) {
    return
  }

  const excludes = getEffectiveExcludes(modeId)
  const workspaceExcludes = getWorkspaceExcludes(modeId)
  const disabledValues = getDisabledValues(modeId)
  const backup = Object.assign({}, excludes)
  Object.keys(disabledValues).forEach((key) => {
    if (backup[key] === false) {
      backup[key] = disabledValues[key]
    }
  })

  const next = Object.keys(excludes).reduce((result, key) => {
    result[key] = false
    return result
  }, Object.assign({}, workspaceExcludes))
  Promise.all([setBackup(modeId, backup), setDisabledValues(modeId, {})]).then(() => updateWorkspaceConfig(modeId, workspaceExcludes, next, callback))
}

/**
 * Enable All
 * @param {function} callback
 */
function enableAll(callback, modeId = 'files') {
  const excludes = getEffectiveExcludes(modeId)
  const workspaceExcludes = getWorkspaceExcludes(modeId)
  const globalExcludes = getGlobalExcludes(modeId)
  const backup = getBackup(modeId)
  const enabled = Object.keys(backup).length > 0 ? excludeConfig.restoreAll(excludes, backup) : excludeConfig.enableAll(excludes, getDisabledValues(modeId))
  const next = Object.keys(enabled).reduce((result, key) => excludeConfig.setWorkspaceOverride(result, globalExcludes, key, enabled[key]), Object.assign({}, workspaceExcludes))
  Promise.all([setBackup(modeId, {}), setDisabledValues(modeId, {})]).then(() => updateWorkspaceConfig(modeId, workspaceExcludes, next, callback))
}

/**
 * VS Code Action - Handle Mapping URI Exclusion to possible Regex Pattern Matches
 * @param {string} uri
 * @param {function} callback
 */
function exclude(uri, callback, modeId = 'files') {
  return _await(this, void 0, void 0, function* () {
    try {
      const _path = uri.fsPath
      const _root = workspace
      const _meta = yield parseFilePath(_path, _root)

      let selections
      let options = []

      let _showPicker = vscode.workspace.getConfiguration().get('explorerExclude.showPicker', vscode.ConfigurationTarget.Workspace)
      if (typeof _showPicker == 'undefined') {
        _showPicker = true
      }

      logger(`Using Picker: ${_showPicker ? 'YES' : 'NO'}`, 'debug')

      if (_showPicker) {
        Object.keys(_meta).forEach((key) => {
          let regex = undefined
          switch (key) {
            case 'path':
              break
            case 'ext':
              regex = _meta[key] ? `**/*${_meta[key]}` : undefined
              break
            case 'base':
              regex = _meta[key]
              break
            case 'dir':
              if (_showPicker) regex = _meta[key] ? `${_meta[key]}/*.*` : undefined
              break
          }
          if (regex) {
            options.push(regex)
          }
        })

        if (_meta['dir'] && _meta['ext']) {
          options.push(`${_meta['dir']}/*${_meta['ext']}`)
        } else if (_meta['ext']) {
          options.push(`*${_meta['ext']}`)
        }

        if (_meta['base']) {
          options.push(`**/${_meta['base']}`)
          if (_meta['dir']) {
            options.push(`${_meta['dir']}/${_meta['base']}`)
          }
        }

        selections = yield showPicker(options.reverse())
      } else {
        selections = [excludeConfig.normalizeGlob(path.relative(_root, uri.fsPath))]
      }

      if (selections && selections.length > 0) {
        const excludes = getWorkspaceExcludes(modeId)

        logger('Current Excludes:', 'debug')
        logger(excludes)

        logger('Adding Exclude:', 'debug')
        logger(selections)

        try {
          const globalExcludes = getGlobalExcludes(modeId)
          const next = excludeConfig.addPatterns(excludes, selections)
          const normalized = selections.reduce((result, key) => excludeConfig.setWorkspaceOverride(result, globalExcludes, excludeConfig.normalizeGlob(key), true), next)
          updateWorkspaceConfig(modeId, excludes, normalized, callback)
        } catch (err) {
          logger(localize('debug.logger.error', 'exclude:update', err.toString()), 'error')
          vscode.window.showErrorMessage(err.message || err)
        }
      }
    } catch (err) {
      logger(localize('debug.logger.error', 'exclude', err.toString()), 'error')
      vscode.window.showErrorMessage(err.message || err)
    }
  })
}

/**
 * Get Excluded Fils
 */
function getExcludes(modeId = 'files') {
  if (!workspace || workspace === '') {
    return []
  }

  return excludeConfig.getViewItems(modeId, getGlobalExcludes(modeId), getWorkspaceExcludes(modeId))
}

function getAllExcludes() {
  return excludeConfig.getViewGroups(
    {
      files: getGlobalExcludes('files'),
      search: getGlobalExcludes('search'),
    },
    {
      files: getWorkspaceExcludes('files'),
      search: getWorkspaceExcludes('search'),
    }
  )
}

/**
 * Get Resource Path
 * @param {string} file
 * @param {string} theme
 */
function getResourcePath(file, theme) {
  return theme ? context.asAbsolutePath(path.join('extension', 'resources', theme, file)) : context.asAbsolutePath(path.join('extension', 'resources', file))
}

/**
 * Get Root Path
 * @param {string} file
 */
function getRootPath(file) {
  return context.asAbsolutePath(file)
}

/**
 * Log output to "SFCC Cartridge Overrides" Output Terminal
 * @param {String} message Debug Message
 * @param {String} type Debug Type
 */
function logger(message, type) {
  let icon = ''

  // Convert message to String if it was not already
  if (typeof message !== 'string') {
    message = JSON.stringify(message, null, 2)
  }

  // Prefix Logger Messages with Icons
  if (type === 'debug') {
    icon = '› '
  } else if (type === 'error') {
    icon = '✖ '
  } else if (type === 'success') {
    icon = '✔ '
  } else if (type === 'warn') {
    icon = '⚠ '
  }

  // Write Output to Terminal
  output.appendLine(`${icon}${message}`)
}

/**
 * Reset All
 * @param {function} callback
 */
function reset(callback, modeId = 'files') {
  const workspaceExcludes = getWorkspaceExcludes(modeId)
  const managedOverrides = getManagedOverrides(modeId)
  const next = Object.keys(managedOverrides).reduce((result, key) => {
    const previous = managedOverrides[key]
    if (previous.hasValue) {
      result[key] = previous.value
    } else {
      delete result[key]
    }
    return result
  }, Object.assign({}, workspaceExcludes))

  Promise.all([setBackup(modeId, {}), setDisabledValues(modeId, {}), setManagedOverrides(modeId, {})]).then(() => updateConfig(modeId, next, callback))
}

/**
 * 迁移用户显式配置的旧设置，不覆盖新扩展已有的设置。
 */
async function migrateLegacySettings() {
  const configuration = vscode.workspace.getConfiguration()
  const settings = [
    ['explorerExclude.backup', 'explorerExclude.backup'],
    ['explorerExclude.showPicker', 'explorerExclude.showPicker'],
  ]
  const targets = [
    ['globalValue', vscode.ConfigurationTarget.Global],
    ['workspaceValue', vscode.ConfigurationTarget.Workspace],
    ['workspaceFolderValue', vscode.ConfigurationTarget.WorkspaceFolder],
  ]

  for (const [legacyKey, nextKey] of settings) {
    const legacy = configuration.inspect(legacyKey)
    const next = configuration.inspect(nextKey)

    if (!legacy || !next) {
      continue
    }

    for (const [valueKey, target] of targets) {
      if (legacy[valueKey] !== undefined && next[valueKey] === undefined) {
        await configuration.update(nextKey, legacy[valueKey], target)
      }
    }
  }
}

/**
 * Save VS Code Context for Pane Reference
 * @param {object} _context
 */
function saveContext(_context) {
  context = _context
  workspace = getWorkspace(_context)
}

/**
 * Toggle All Excludes
 * @param {Function} callback Callback Command
 */
function toggleAll(callback, modeId = 'files') {
  if (Object.keys(getBackup(modeId)).length > 0) {
    enableAll(callback, modeId)
  } else {
    disableAll(callback, modeId)
  }
}

/**
 * Toggle Visibility of Excluded Pattern
 * @param {string} key
 * @param {function} callback
 */
function toggleExclude(key, callback) {
  const excludeKey = typeof key === 'object' ? key.key : key
  const modeId = typeof key === 'object' && key.mode ? key.mode : 'files'

  if (!excludeKey) {
    return false
  }

  const excludes = getEffectiveExcludes(modeId)
  const workspaceExcludes = getWorkspaceExcludes(modeId)
  const globalExcludes = getGlobalExcludes(modeId)

  // Invert Selection
  if (Object.prototype.hasOwnProperty.call(excludes, excludeKey)) {
    logger(`Toggle: ${excludes[excludeKey] === false ? 'ON' : 'OFF'} | ${excludeKey}`, 'debug')
    const toggled = excludeConfig.togglePattern(excludes, excludeKey, getDisabledValues(modeId))
    const next = excludeConfig.setWorkspaceOverride(workspaceExcludes, globalExcludes, excludeKey, toggled.excludes[excludeKey])
    setDisabledValues(modeId, toggled.disabledValues).then(() => updateWorkspaceConfig(modeId, workspaceExcludes, next, callback))
  }
}

async function chooseMode() {
  const selected = await vscode.window.showQuickPick(
    ['files', 'search'].map((modeId) => {
      const mode = excludeConfig.getMode(modeId)
      return { label: localize(mode.labelKey), modeId: mode.id }
    }),
    { placeHolder: localize('picker.excludeType') }
  )

  return selected ? selected.modeId : undefined
}

module.exports = {
  deleteExclude,
  disableAll,
  enableAll,
  exclude,
  chooseMode,
  getAllExcludes,
  getExcludes,
  getMode: excludeConfig.getMode,
  getResourcePath,
  getRootPath,
  logger,
  initializeState,
  migrateLegacySettings,
  reset,
  saveContext,
  toggleAll,
  toggleExclude,
}
