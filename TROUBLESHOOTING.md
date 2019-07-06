Troubleshooting
===

> This document contains a list of known issues, and how to solve them.

`Unable to install Extension`
---

If you are getting an error like this one:

```
Unable to install Extension 'redvanworkshop.explorer-exclude-vscode-extension-1.1.0' as it is not compatible with Code '1.26.0'.
```

It is because you downloaded the Extension from the VS Code Marketplace Website manually ( and not through VS Code's internal extension listing ) and tried to install it into an older, unsupported version of VS Code.

This extension requires VS Code v1.32 or newer.  If you would like to install this extension, you will need to [update VS Code](https://code.visualstudio.com/download) to version v1.32 or newer.