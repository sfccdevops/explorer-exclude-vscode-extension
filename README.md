# Explorer Exclude Manager — The Maintained Version of Explorer Exclude

> **Important for existing Explorer Exclude users**
>
> Explorer Exclude Manager is the actively maintained Marketplace release of the original Explorer Exclude project.
>
> Existing users should install **Explorer Exclude Manager** and uninstall the previous Marketplace extension after the configuration migration is complete:
>
> * Previous extension: `PeterSchmalfeldt.explorer-exclude`
> * Maintained extension: `MadCatPX.explorer-exclude-manager`
> * [Install Explorer Exclude Manager from the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=MadCatPX.explorer-exclude-manager)
>
> Both extensions manage the same built-in VS Code exclusion settings. Keeping both extensions enabled may cause conflicting backups or unexpected configuration changes.

Explorer Exclude Manager is the currently maintained version of the original [Explorer Exclude](https://github.com/sfccdevops/explorer-exclude-vscode-extension) extension for Visual Studio Code.

The project continues to be developed in the original GitHub repository. Current and future Marketplace releases are published by **MadCatPX** under the name **Explorer Exclude Manager**, with improved configuration isolation, glob handling, and compatibility with current VS Code versions.

> Explorer Exclude was originally created by [Peter Schmalfeldt](https://peterschmalfeldt.com). Peter has authorized **MadCatPX** to maintain the project in its original repository and publish future releases through the MadCatPX Marketplace publisher.
>
> Explorer Exclude Manager is not a separate fork or replacement repository. It is the continued maintenance of the same project under a new Marketplace publishing identity.

![screenshot](https://explorer-exclude.s3.amazonaws.com/screenshot.png?v=1.3.0)
## Features

* Hide files and folders from Explorer, Search Results, and Quick Open.
* Manage hidden entries from the **Excluded Items** Explorer pane.
* Support single-root and multi-root workspaces.
* Toggle hidden entries and groups without manually editing settings.
* Manage `files.exclude` and `search.exclude` independently.
* Preserve grouped glob patterns such as `**/{__pycache__,.pytest_cache}`.
* Separate Global and Workspace rules while preserving conditional exclusion values and workspace overrides.

<!-- TODO: Add a screenshot of the Excluded Items pane and group actions. -->

> Explorer Exclude Manager changes VS Code exclusion settings. It never deletes or moves files.

## Installation

Install the extension from the VS Code Extensions view by searching for **Explorer Exclude Manager**.

You can also install it directly from the Visual Studio Marketplace:

[Install Explorer Exclude Manager](https://marketplace.visualstudio.com/items?itemName=MadCatPX.explorer-exclude-manager)

To install a packaged `.vsix` file, use **Extensions: Install from VSIX...**.

For source checkout and contribution guidance, see [Developer Setup](DEVELOPERS.md).

## Usage

### Hide files and folders

1. In the VS Code Explorer, right-click a file or folder and choose **Add to Excludes...**.
   ![explorer](https://i.ibb.co/zk8P30D/d1573af4394f354b12f55b16f95e344c.png)
2. Choose **File Excludes** to update `files.exclude`, **Search Excludes** to update `search.exclude`, or both when the resource should be hidden from both places.
   ![picker](https://i.ibb.co/C5RTz6fv/e6ab9e73dfbcb860ed20252b9bfb8028.png)
3. With the pattern picker enabled, which is the default, select one or more proposed glob patterns. The extension writes the selected patterns to the chosen workspace setting.

    ![picker](https://i.ibb.co/WNMdwbhy/dbb6d12502c47b26679ae9c6e20f5a9f.png)

To skip the pattern picker and add the selected resource's workspace-relative path directly, configure:

```json
{
  "explorerExcludeManager.showPicker": false
}
```

### Manage excluded items

Open the **Excluded Items** pane in Explorer to review the effective exclusions. Entries are grouped by **File Excludes** and **Search Excludes**, then by **Global** and **Workspace** scope. Global groups are collapsed by default.

* Select an entry to toggle whether that pattern is active. Toggling a global rule creates a workspace override instead of changing the global setting.
* Right-click a workspace entry and choose **Remove from Hidden Items** to delete it from the corresponding workspace setting.
* Use the inline group actions to enable, disable, reset, or open the relevant VS Code setting for that group.
* **File Excludes** also provides a group visibility toggle.
* Use **Reset Hidden Items** to restore workspace exclusions that the extension previously changed. VS Code asks for confirmation first.

![view-pane](https://i.ibb.co/ccxgnXPv/7dbabb98b077798938f7ef28ba56b497.png)

## Configuration behavior

Explorer Exclude Manager manages the following built-in VS Code settings:

* `files.exclude`
* `search.exclude`

These are shared VS Code settings and are not specific to Explorer Exclude or Explorer Exclude Manager.

The extension writes changes to the workspace scope so project exclusions do not unintentionally copy user-level exclusions into a workspace. In a multi-root workspace, review the workspace-level settings and ensure generated relative patterns match the intended folder.

Grouped glob keys are retained as complete patterns. For example:

```json
{
  "files.exclude": {
    "**/{__pycache__,.pytest_cache}": true
  }
}
```

The grouped key remains one entry instead of being split into separate patterns.

## Migrating from Explorer Exclude

Explorer Exclude Manager uses the `explorerExcludeManager.*` configuration namespace.

On activation, it automatically migrates explicitly configured values from the previous `explorerExclude.*` namespace:

* `explorerExclude.backup` to `explorerExcludeManager.backup`
* `explorerExclude.showPicker` to `explorerExcludeManager.showPicker`

Migration preserves the original user, workspace, or workspace-folder scope and does not overwrite a value already configured for Explorer Exclude Manager.

The extension does not copy `files.exclude` or `search.exclude`, because these are built-in VS Code settings already shared by both Marketplace releases.

### Migration steps for existing users

1. Install [Explorer Exclude Manager](https://marketplace.visualstudio.com/items?itemName=MadCatPX.explorer-exclude-manager).
2. Open or reload VS Code so the extension can migrate the previous configuration.
3. Confirm that your exclusion settings and hidden items work as expected.
4. Uninstall the previous `PeterSchmalfeldt.explorer-exclude` Marketplace extension.
5. Reload VS Code once more.

Uninstalling the previous Marketplace extension after migration is strongly recommended. Both extensions manage the same built-in exclusion settings, and keeping both enabled can result in conflicting backups or unexpected configuration changes.

## Compatibility

Explorer Exclude Manager requires VS Code `1.110.0` or newer.

See [Troubleshooting](TROUBLESHOOTING.md) for installation, migration, configuration, and workspace-related issues.

## Support

* [Repository](https://github.com/sfccdevops/explorer-exclude-vscode-extension)
* [Report an issue](https://github.com/sfccdevops/explorer-exclude-vscode-extension/issues)
* [Troubleshooting](TROUBLESHOOTING.md)

When opening an issue, include:

* Your VS Code version
* Your Explorer Exclude Manager version
* Your operating system
* Your workspace type
* Relevant `files.exclude` or `search.exclude` settings
* Steps to reproduce the issue

## Credits and attribution

Explorer Exclude was originally created by [Peter Schmalfeldt](https://peterschmalfeldt.com).

The project remains in its original repository and is now maintained by **MadCatPX** with the original author's permission. Current releases are published as **Explorer Exclude Manager** through the MadCatPX Marketplace publisher.

```text
Copyright (c) 2019 SFCC DevOps
```

The original copyright notice and MIT License are retained in this repository.

## License

Explorer Exclude Manager is distributed under the [MIT License](LICENSE).
