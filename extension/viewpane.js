const jsonc_parser = require('jsonc-parser')
const vscode = require('vscode')

const { localize } = require('vscode-nls-i18n')

const util = require('./util')

class ViewPane {
  constructor(viewPaneName) {
    this.defaultExclude = ['**/.git', '**/.svn', '**/.hg', '**/CVS', '**/.DS_Store', '**/Thumbs.db', '**/*.git']
    this.viewUpdatedEventEmitter = new vscode.EventEmitter()
    this.onDidChangeTreeData = this.viewUpdatedEventEmitter.event
    this.tree = {
      type: 'object',
      offset: 0,
      length: 0,
      children: [],
    }
    this.register(viewPaneName)
    this.registerEvents()
  }

  register(name = '') {
    vscode.window.registerTreeDataProvider(name, this)
  }

  registerEvents() {
    this.onDidChangeTreeData(() => {})
  }

  update(list) {
    let treeString = JSON.stringify(list)
    this.tree = jsonc_parser.parseTree(treeString)
    this.viewUpdatedEventEmitter.fire()
  }

  getChildren() {
    return Promise.resolve(this.tree.children)
  }

  getTreeItem(node) {
    const value = node.value
    const enabled = parseInt(value[value.length - 1])
    const title = value.substring(0, value.length - 2)
    const icon = enabled ? 'checked.svg' : 'unchecked.svg'

    let treeItem = new vscode.TreeItem(title, vscode.TreeItemCollapsibleState.None)

    treeItem.iconPath = {
      light: util.getResourcePath(icon, 'light'),
      dark: util.getResourcePath(icon, 'dark'),
    }
    treeItem.contextValue = title
    treeItem.tooltip = enabled ? localize('tooltip.show', title) : localize('tooltip.hide', title)
    treeItem.description = this.defaultExclude.indexOf(title) > -1 ? 'system' : ''
    treeItem.command = {
      command: 'explorer-exclude.toggle',
      title: title,
      arguments: [title],
    }

    return treeItem
  }
}

module.exports = ViewPane
