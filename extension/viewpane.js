const vscode = require('vscode')

const { localize } = require('vscode-nls-i18n')

class ViewPane {
  constructor(viewPaneName) {
    this.viewUpdatedEventEmitter = new vscode.EventEmitter()
    this.onDidChangeTreeData = this.viewUpdatedEventEmitter.event
    this.tree = {
      type: 'object',
      offset: 0,
      length: 0,
      children: [],
    }
    this.expandedGroups = new Set()
    this.collapsedGroups = new Set()
    this.register(viewPaneName)
    this.registerEvents()
  }

  register(name = '') {
    vscode.window.registerTreeDataProvider(name, this)
  }

  registerEvents() {
    this.onDidChangeTreeData(() => {})
  }

  update(groups) {
    this.tree = groups.map((group) => this.createGroup(group.mode, group.categories))
    this.viewUpdatedEventEmitter.fire()
  }

  toggleGroupExpansion(modeId) {
    if (this.expandedGroups.has(modeId)) {
      this.expandedGroups.delete(modeId)
      this.collapsedGroups.add(modeId)
    } else {
      this.collapsedGroups.delete(modeId)
      this.expandedGroups.add(modeId)
    }

    this.tree.forEach((group) => {
      if (group.mode === modeId) {
        group.children.forEach((category) => {
          category.expanded = this.isCategoryExpanded(modeId, category)
        })
      }
    })
    this.viewUpdatedEventEmitter.fire()
  }

  isCategoryExpanded(modeId, category) {
    if (this.expandedGroups.has(modeId)) {
      return true
    }
    if (this.collapsedGroups.has(modeId)) {
      return false
    }
    return category.labelKey !== 'view.category.global'
  }

  createGroup(mode, children) {
    return {
      mode: mode.id,
      labelKey: mode.labelKey,
      settingKey: mode.settingKey,
      children: children.map((child) => Object.assign({}, child, { expanded: this.isCategoryExpanded(mode.id, child), mode: mode.id })),
      type: 'group',
    }
  }

  getChildren(node) {
    return Promise.resolve(node ? node.children : this.tree)
  }

  getTreeItem(node) {
    if (node.type === 'group' || node.type === 'category') {
      const label = localize(node.labelKey)
      const collapsibleState = node.type === 'category' && !node.expanded ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded
      const treeItem = new vscode.TreeItem(label, collapsibleState)
      if (node.type === 'category') {
        treeItem.id = `explorer-exclude.${node.mode}.${node.labelKey}.${node.expanded ? 'expanded' : 'collapsed'}`
      }
      treeItem.description = localize('view.itemCount', node.children.length)
      if (node.type === 'group') {
        treeItem.contextValue = `group-${node.mode}`
      }
      return treeItem
    }

    let treeItem = new vscode.TreeItem(node.value, vscode.TreeItemCollapsibleState.None)

    treeItem.iconPath = new vscode.ThemeIcon(node.enabled ? 'pass-filled' : 'circle-large-outline')
    treeItem.contextValue = node.scope === 'workspace' ? 'removable' : 'global'
    treeItem.tooltip = node.enabled ? localize('tooltip.show', node.value) : localize('tooltip.hide', node.value)
    treeItem.command = {
      command: 'explorer-exclude.toggle',
      title: node.value,
      arguments: [node],
    }

    return treeItem
  }
}

module.exports = ViewPane
