'use strict'

const FILE_DEFAULTS = {
  '**/.git': true,
  '**/.svn': true,
  '**/.hg': true,
  '**/CVS': true,
  '**/.DS_Store': true,
  '**/Thumbs.db': true,
  '**/*.git': true,
}

const modes = {
  files: {
    id: 'files',
    settingKey: 'files.exclude',
    labelKey: 'excludeType.files',
    backupKey: 'explorer-exclude.files.backup',
    disabledValuesKey: 'explorer-exclude.files.disabledValues',
    resetValue: FILE_DEFAULTS,
  },
  search: {
    id: 'search',
    settingKey: 'search.exclude',
    labelKey: 'excludeType.search',
    backupKey: 'explorer-exclude.search.backup',
    disabledValuesKey: 'explorer-exclude.search.disabledValues',
    resetValue: {},
  },
}

function getMode(modeId) {
  return modes[modeId] || modes.files
}

function mergeExcludes(...sources) {
  return Object.assign({}, ...sources.filter((source) => source && typeof source === 'object'))
}

function valuesMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function setWorkspaceOverride(workspaceExcludes, globalExcludes, key, value) {
  const next = Object.assign({}, workspaceExcludes)

  if (Object.prototype.hasOwnProperty.call(globalExcludes, key) && valuesMatch(globalExcludes[key], value)) {
    delete next[key]
  } else {
    next[key] = value
  }

  return next
}

function normalizeGlob(value) {
  return value.replace(/\\/g, '/')
}

function addPatterns(excludes, selections) {
  const next = Object.assign({}, excludes)

  Array.from(new Set(selections))
    .map(normalizeGlob)
    .filter((value) => value !== '*')
    .forEach((value) => {
      next[value] = true
    })

  return next
}

function removePattern(excludes, key) {
  return Object.keys(excludes)
    .filter((currentKey) => currentKey !== key)
    .reduce((next, currentKey) => {
      next[currentKey] = excludes[currentKey]
      return next
    }, {})
}

function togglePattern(excludes, key, disabledValues) {
  const next = Object.assign({}, excludes)
  const nextDisabledValues = Object.assign({}, disabledValues)
  const value = next[key]

  if (value === false) {
    next[key] = Object.prototype.hasOwnProperty.call(nextDisabledValues, key) ? nextDisabledValues[key] : true
    delete nextDisabledValues[key]
  } else {
    if (value && typeof value === 'object') {
      nextDisabledValues[key] = value
    }
    next[key] = false
  }

  return { excludes: next, disabledValues: nextDisabledValues }
}

function disableAll(excludes) {
  return Object.keys(excludes).reduce((next, key) => {
    next[key] = false
    return next
  }, {})
}

function enableAll(excludes, disabledValues = {}) {
  return Object.keys(excludes).reduce((next, key) => {
    next[key] = excludes[key] === false && Object.prototype.hasOwnProperty.call(disabledValues, key) ? disabledValues[key] : excludes[key] === false ? true : excludes[key]
    return next
  }, {})
}

function restoreAll(excludes, backup) {
  const next = Object.assign({}, excludes)

  Object.keys(backup).forEach((key) => {
    if (next[key] === false) {
      next[key] = backup[key]
    }
  })

  return next
}

function getViewItems(modeId, globalExcludes = {}, workspaceExcludes = {}) {
  const mode = getMode(modeId)
  const excludes = mergeExcludes(globalExcludes, workspaceExcludes)

  return Object.keys(excludes).map((key) => ({
    enabled: excludes[key] !== false,
    excludeValue: excludes[key],
    key,
    mode: mode.id,
    settingKey: mode.settingKey,
    scope: Object.prototype.hasOwnProperty.call(workspaceExcludes, key) ? 'workspace' : 'global',
    value: key,
  }))
}

function getViewGroups(globalExcludesByMode = {}, workspaceExcludesByMode = {}) {
  return ['files', 'search'].map((modeId) => {
    const mode = getMode(modeId)
    const globalExcludes = globalExcludesByMode[modeId] || {}
    const workspaceExcludes = workspaceExcludesByMode[modeId] || {}

    return {
      categories: getViewCategories(modeId, globalExcludes, workspaceExcludes),
      items: getViewItems(modeId, globalExcludes, workspaceExcludes),
      mode,
    }
  })
}

function getViewCategories(modeId, globalExcludes = {}, workspaceExcludes = {}) {
  const items = getViewItems(modeId, globalExcludes, workspaceExcludes).flatMap((item) =>
    expandBraces(item.key).map((value) =>
      Object.assign({}, item, {
        scope: Object.prototype.hasOwnProperty.call(workspaceExcludes, item.key) ? 'workspace' : 'global',
        value,
      })
    )
  )
  const globalItems = items.filter((item) => item.scope === 'global')
  const workspaceItems = items.filter((item) => item.scope === 'workspace')

  return [
    { children: globalItems, labelKey: 'view.category.global', type: 'category' },
    { children: workspaceItems, labelKey: 'view.category.workspace', type: 'category' },
  ].filter((category) => category.children.length > 0)
}

function expandBraces(value) {
  const match = value.match(/\{([^{}]+)\}/)

  if (!match) {
    return [value]
  }

  return match[1].split(',').flatMap((part) => expandBraces(value.replace(match[0], part)))
}

module.exports = {
  FILE_DEFAULTS,
  addPatterns,
  disableAll,
  enableAll,
  expandBraces,
  getMode,
  mergeExcludes,
  getViewCategories,
  getViewGroups,
  getViewItems,
  normalizeGlob,
  removePattern,
  restoreAll,
  setWorkspaceOverride,
  togglePattern,
  valuesMatch,
}
