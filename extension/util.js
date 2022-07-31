'use strict'

const fs = require('fs')
const path = require('path')
const util = require('util')
const vscode = require('vscode')

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
        } catch (e) {
          reject(e)
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value))
        } catch (e) {
          reject(e)
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
        logger(err, 'error')
      }
    }
  }

  // If we did not get Workspace, let the user know
  if (!workspace) {
    const message = localize('debug.logger.missingWorkspace')
    logger(message, 'error')
    vscode.window.showErrorMessage(`${localize('extension.title')}: ${message}`)
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
      if (util.isNullOrUndefined(error)) {
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
  return util.isNullOrUndefined(_path) || _path === ''
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
    } catch (error) {
      return Promise.reject(error)
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
const updateConfig = (excludes, callback, message) => {
  try {
    vscode.commands.executeCommand('setContext', 'explorer-exclude.enabled', true)

    // Update Main VS Code File Exclude
    vscode.workspace
      .getConfiguration()
      .update('files.exclude', excludes, vscode.ConfigurationTarget.Workspace)
      .then(() => {
        // Remove Backup since we made a manual change
        vscode.workspace
          .getConfiguration()
          .update('explorerExclude.backup', {}, vscode.ConfigurationTarget.Workspace)
          .then(() => {
            if (message) {
              vscode.window.showInformationMessage(message)
            }

            if (typeof callback === 'function') {
              callback()
            }
          })
      })
  } catch (error) {
    logger(error, 'error')
    vscode.window.showErrorMessage(error.message || error)
  }
}

/**
 * Delete Key from Exclude Config
 * @param {string} key
 * @param {function} callback
 */
function deleteExclude(key, callback) {
  if (!key) {
    return false
  }

  const excludes = vscode.workspace.getConfiguration().get('files.exclude', vscode.ConfigurationTarget.Workspace) || {}

  // Remove if already set
  if (key && Object.prototype.hasOwnProperty.call(excludes, key)) {
    const newExcludes = Object.keys(excludes)
      .filter((k) => k !== key)
      .reduce((obj, k) => {
        obj[k] = excludes[k]
        return obj
      }, {})
    updateConfig(newExcludes, callback, localize('config.removedKey', key))
  }
}

/**
 * Disable All
 * @param {function} callback
 */
function disableAll(callback) {
  const excludes = vscode.workspace.getConfiguration().get('files.exclude', vscode.ConfigurationTarget.Workspace) || {}

  for (let key in excludes) {
    if (Object.prototype.hasOwnProperty.call(excludes, key)) {
      excludes[key] = false
    }
  }

  updateConfig(excludes, callback)
}

/**
 * Enable All
 * @param {function} callback
 */
function enableAll(callback) {
  const excludes = vscode.workspace.getConfiguration().get('files.exclude', vscode.ConfigurationTarget.Workspace) || {}

  for (let key in excludes) {
    if (Object.prototype.hasOwnProperty.call(excludes, key)) {
      excludes[key] = true
    }
  }

  updateConfig(excludes, callback)
}

/**
 * VS Code Action - Handle Mapping URI Exclusion to possible Regex Pattern Matches
 * @param {string} uri
 * @param {function} callback
 */
function exclude(uri, callback) {
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

      logger(`USING PICKER: ${_showPicker ? 'YES' : 'NO'}`, 'debug')

      if (_showPicker) {
        Object.keys(_meta).forEach((key) => {
          let regex = undefined
          switch (key) {
            case 'path':
              break
            case 'ext':
              regex = _meta[key] ? `**${path.sep}*${_meta[key]}` : undefined
              break
            case 'base':
              regex = _meta[key]
              break
            case 'dir':
              if (_showPicker) regex = _meta[key] ? `${_meta[key] + path.sep}*.*` : undefined
              break
          }
          if (regex) {
            options.push(regex)
          }
        })

        if (_meta['dir'] && _meta['ext']) {
          options.push(`${_meta['dir']}${path.sep}*${_meta['ext']}`)
        } else if (_meta['ext']) {
          options.push(`*${_meta['ext']}`)
        }

        if (_meta['base']) {
          options.push(`**${path.sep}${_meta['base']}`)
          if (_meta['dir']) {
            options.push(`${_meta['dir']}${path.sep}${_meta['base']}`)
          }
        }

        selections = yield showPicker(options.reverse())
      } else {
        selections = [path.relative(_root, uri.fsPath)]
      }

      if (selections && selections.length > 0) {
        const excludes = vscode.workspace.getConfiguration().get('files.exclude', vscode.ConfigurationTarget.Workspace) || {}

        logger('CURRENT EXCLUDES:', 'debug')
        logger(excludes)

        logger('ADDING EXCLUDE:', 'debug')
        logger(selections)

        try {
          const newExcludes = Object.assign({}, excludes)
          Array.from(new Set(selections))
            .filter((v) => v !== '*')
            .forEach((rule) => {
              newExcludes[rule] = true
            })
          updateConfig(newExcludes, callback)
        } catch (error) {
          vscode.window.showErrorMessage(error.message || error)
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(error.message || error)
    }
  })
}

/**
 * Get Excluded Fils
 */
function getExcludes() {
  if (!workspace || workspace === '') {
    return []
  }

  const excludes = vscode.workspace.getConfiguration().get('files.exclude', vscode.ConfigurationTarget.Workspace) || {}

  let list = excludes ? Object.keys(excludes) : []

  for (let i = 0; i < list.length; i++) {
    let enabled = excludes[list[i]] ? 1 : 0
    list[i] = `${list[i]}|${enabled}`
  }

  return list
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
function reset(callback) {
  updateConfig(
    {
      '**/.git': true,
      '**/.svn': true,
      '**/.hg': true,
      '**/CVS': true,
      '**/.DS_Store': true,
      '**/Thumbs.db': true,
      '**/*.git': true,
    },
    callback
  )
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
function toggleAll(callback) {
  try {
    const excludes = vscode.workspace.getConfiguration().get('files.exclude', vscode.ConfigurationTarget.Workspace)
    const backup = vscode.workspace.getConfiguration().get('explorerExclude.backup', vscode.ConfigurationTarget.Workspace)
    const restore = JSON.stringify(backup) !== '{}'

    let newExcludes = Object.assign({}, excludes)

    if (!newExcludes) {
      newExcludes = {}
    }

    for (let key in newExcludes) {
      if (Object.prototype.hasOwnProperty.call(newExcludes, key)) {
        newExcludes[key] = false
      }
    }

    const newBackup = restore ? {} : excludes
    const newExclude = restore ? backup : newExcludes

    vscode.commands.executeCommand('setContext', 'explorer-exclude.enabled', restore)

    vscode.workspace
      .getConfiguration()
      .update('files.exclude', newExclude, vscode.ConfigurationTarget.Workspace)
      .then(() => {
        vscode.workspace
          .getConfiguration()
          .update('explorerExclude.backup', newBackup, vscode.ConfigurationTarget.Workspace)
          .then(() => {
            if (typeof callback === 'function') {
              callback()
            }
          })
      })
  } catch (error) {
    vscode.window.showErrorMessage(error.message || error)
  }
}

/**
 * Toggle Visibility of Excluded Pattern
 * @param {string} key
 * @param {function} callback
 */
function toggleExclude(key, callback) {
  if (!key) {
    return false
  }

  const excludes = vscode.workspace.getConfiguration().get('files.exclude', vscode.ConfigurationTarget.Workspace) || {}

  // Invert Selection
  if (key && Object.prototype.hasOwnProperty.call(excludes, key)) {
    logger(`TOGGLE: ${excludes[key] ? 'OFF' : 'ON'}`, 'debug')
    excludes[key] = !excludes[key]
    updateConfig(excludes, callback)
  }
}

module.exports = {
  deleteExclude,
  disableAll,
  enableAll,
  exclude,
  getExcludes,
  getResourcePath,
  getRootPath,
  logger,
  reset,
  saveContext,
  toggleAll,
  toggleExclude,
}
