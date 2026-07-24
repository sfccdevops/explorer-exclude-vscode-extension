'use strict'

const assert = require('assert')
const fs = require('fs')
const Module = require('module')
const path = require('path')

const config = require('../extension/exclude-config')

function test(name, callback) {
  try {
    callback()
    process.stdout.write(`PASS ${name}\n`)
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n${error.stack}\n`)
    process.exitCode = 1
  }
}

function loadViewPane() {
  const vscode = {
    EventEmitter: class {
      constructor() {
        this.event = () => {}
      }

      fire() {}
    },
    ThemeIcon: class {},
    TreeItem: class {
      constructor(label, collapsibleState) {
        this.label = label
        this.collapsibleState = collapsibleState
      }
    },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    window: { registerTreeDataProvider() {} },
  }
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === 'vscode') {
      return vscode
    }
    if (request === 'vscode-nls-i18n') {
      return { localize: (key) => key }
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  const modulePath = require.resolve('../extension/viewpane')
  delete require.cache[modulePath]
  const ViewPane = require('../extension/viewpane')
  Module._load = originalLoad
  return { ViewPane, vscode }
}

test('uses separate File and Search descriptors', () => {
  assert.strictEqual(config.getMode('files').settingKey, 'files.exclude')
  assert.strictEqual(config.getMode('search').settingKey, 'search.exclude')
  assert.deepStrictEqual(config.getMode('search').resetValue, {})
  assert.deepStrictEqual(config.getMode('files').resetValue, config.FILE_DEFAULTS)
})

test('normalizes Windows glob separators when adding patterns', () => {
  assert.deepStrictEqual(config.addPatterns({}, ['folder\\file.js', '*', 'folder\\file.js']), {
    'folder/file.js': true,
  })
})

test('removes only the selected pattern', () => {
  assert.deepStrictEqual(config.removePattern({ a: true, b: false }, 'a'), { b: false })
})

test('removes a workspace override when it matches the global value', () => {
  const globalExcludes = { '**/docs': true }

  assert.deepStrictEqual(config.setWorkspaceOverride({ '**/docs': false }, globalExcludes, '**/docs', true), {})
  assert.deepStrictEqual(config.setWorkspaceOverride({}, globalExcludes, '**/docs', false), { '**/docs': false })
})

test('keeps File and Search view items routed to their own setting keys', () => {
  assert.strictEqual(config.getViewItems('files', { '**/*.js': true })[0].settingKey, 'files.exclude')
  assert.strictEqual(config.getViewItems('search', { '**/*.js': true })[0].settingKey, 'search.exclude')
})

test('always creates File and Search groups independently', () => {
  const groups = config.getViewGroups({ files: { a: true }, search: { b: false } })
  assert.deepStrictEqual(groups.map((group) => group.mode.id), ['files', 'search'])
  assert.strictEqual(groups[0].items[0].settingKey, 'files.exclude')
  assert.strictEqual(groups[1].items[0].settingKey, 'search.exclude')
})

test('shows global exclusions in Search Excludes when no workspace rules are configured', () => {
  const searchGlobalExcludes = { '**/node_modules': true }
  const groups = config.getViewGroups({ files: {}, search: searchGlobalExcludes }, { files: {}, search: {} })
  const searchGroup = groups.find((group) => group.mode.id === 'search')

  assert.deepStrictEqual(searchGroup.categories.map((category) => category.labelKey), ['view.category.global'])
  assert.deepStrictEqual(searchGroup.categories[0].children.map((item) => item.key), Object.keys(searchGlobalExcludes))
})

test('shows a workspace override once with its effective state', () => {
  const groups = config.getViewGroups(
    { files: {}, search: { '**/node_modules': true } },
    { files: {}, search: { '**/node_modules': false } }
  )
  const searchGroup = groups.find((group) => group.mode.id === 'search')
  const item = searchGroup.categories[0].children[0]

  assert.deepStrictEqual(searchGroup.categories.map((category) => category.labelKey), ['view.category.workspace'])
  assert.strictEqual(item.scope, 'workspace')
  assert.strictEqual(item.enabled, false)
})

test('groups expanded File and Search rules into Global and Workspace categories', () => {
  const files = config.getViewCategories('files', { '**/.git': true }, { '**/*.{js,ts}': false })
  const search = config.getViewCategories('search', { '**/node_modules': true }, { '**/build': true })

  assert.deepStrictEqual(files.map((category) => category.labelKey), ['view.category.global', 'view.category.workspace'])
  assert.deepStrictEqual(files[0].children.map((item) => item.value), ['**/.git'])
  assert.deepStrictEqual(files[1].children.map((item) => item.value), ['**/*.js', '**/*.ts'])
  assert.deepStrictEqual(search.map((category) => category.labelKey), ['view.category.global', 'view.category.workspace'])
  assert.deepStrictEqual(search[0].children.map((item) => item.value), ['**/node_modules'])
  assert.deepStrictEqual(search[1].children.map((item) => item.value), ['**/build'])
  assert.strictEqual(files[1].children[0].key, '**/*.{js,ts}')
})

test('restores conditional File exclude values after a toggle', () => {
  const excludes = { '**/*.js': { when: '$(basename).ts' } }
  const disabled = config.togglePattern(excludes, '**/*.js', {})
  assert.deepStrictEqual(disabled.excludes, { '**/*.js': false })
  assert.deepStrictEqual(disabled.disabledValues, excludes)

  const restored = config.togglePattern(disabled.excludes, '**/*.js', disabled.disabledValues)
  assert.deepStrictEqual(restored.excludes, excludes)
  assert.deepStrictEqual(restored.disabledValues, {})
})

test('keeps a conditional value when enabling all after a single disable', () => {
  const conditional = { '**/*.js': { when: '$(basename).ts' } }
  const disabled = config.togglePattern(conditional, '**/*.js', {})
  assert.deepStrictEqual(config.enableAll(disabled.excludes, disabled.disabledValues), conditional)
})

test('restores only still-disabled values after a batch change', () => {
  const backup = { a: true, b: { when: '$(basename).ts' } }
  const disabled = config.disableAll(backup)
  assert.deepStrictEqual(disabled, { a: false, b: false })
  assert.deepStrictEqual(config.restoreAll({ a: false, b: true, c: false }, backup), {
    a: true,
    b: true,
    c: false,
  })
})

test('keeps every NLS file aligned with the English keys', () => {
  const root = path.join(__dirname, '..')
  const english = Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'package.nls.json'), 'utf8'))).sort()
  const localeFiles = fs.readdirSync(root).filter((file) => /^package\.nls\..+\.json$/.test(file))

  localeFiles.forEach((file) => {
    const keys = Object.keys(JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))).sort()
    assert.deepStrictEqual(keys, english, file)
  })
})

test('shows the visibility action only for File Excludes', () => {
  const root = path.join(__dirname, '..')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const groupActions = manifest.contributes.menus['view/item/context']
  const fileOperations = groupActions.filter((item) => item.when.includes('viewItem == group-files')).map((item) => item.command)
  const searchOperations = groupActions.filter((item) => item.when.includes('viewItem == group-search')).map((item) => item.command)

  assert.deepStrictEqual(fileOperations, [
    'explorer-exclude.disableAll',
    'explorer-exclude.enableAll',
    'explorer-exclude.toggleAllOff',
    'explorer-exclude.toggleGroupExpansion',
    'explorer-exclude.reset',
    'explorer-exclude.openSettings',
  ])
  assert.deepStrictEqual(searchOperations, [
    'explorer-exclude.disableAll',
    'explorer-exclude.enableAll',
    'explorer-exclude.toggleGroupExpansion',
    'explorer-exclude.reset',
    'explorer-exclude.openSettings',
  ])
  assert.deepStrictEqual(
    groupActions
      .filter((item) => fileOperations.includes(item.command))
      .map((item) => item.group),
    ['inline@1', 'inline@2', 'inline@3', 'inline@4', 'inline@5', 'inline@6']
  )
})

test('offers an expansion action for each exclusion group', () => {
  const root = path.join(__dirname, '..')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const command = manifest.contributes.commands.find((item) => item.command === 'explorer-exclude.toggleGroupExpansion')
  const menu = manifest.contributes.menus['view/item/context'].find((item) => item.command === 'explorer-exclude.toggleGroupExpansion')

  assert.ok(command)
  assert.ok(menu.when.includes('viewItem == group-files'))
  assert.ok(menu.when.includes('viewItem == group-search'))
})

test('replaces category identity when a group expansion is toggled', () => {
  const { ViewPane, vscode } = loadViewPane()
  const pane = new ViewPane('test')
  pane.update([{ mode: { id: 'files', labelKey: 'excludeType.files', settingKey: 'files.exclude' }, categories: [{ children: [], labelKey: 'view.category.global', type: 'category' }] }])

  const collapsedByDefault = pane.getTreeItem(pane.tree[0].children[0])
  pane.toggleGroupExpansion('files')
  const expanded = pane.getTreeItem(pane.tree[0].children[0])

  assert.strictEqual(collapsedByDefault.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed)
  assert.strictEqual(expanded.collapsibleState, vscode.TreeItemCollapsibleState.Expanded)
  assert.notStrictEqual(collapsedByDefault.id, expanded.id)
})

