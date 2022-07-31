const vscode = require('vscode');
const fs = require('fs');
const marked = require('marked');

const util = require('./util');

class WelcomePane {
    constructor() {}

    show() {
        fs.readFile(util.getResourcePath('welcome.html'), function(err, html) {
            if (!err) {
                const panel = vscode.window.createWebviewPanel(
                    'explorerExclude',
                    'welcome',
                    vscode.ViewColumn.One,
                    {}
                );

                const README = fs.readFileSync(util.getRootPath('README.md'), 'utf8');
                const CHANGELOG = fs.readFileSync(util.getRootPath('CHANGELOG.md'), 'utf8');
                const TROUBLESHOOTING = fs.readFileSync(util.getRootPath('TROUBLESHOOTING.md'), 'utf8');

                let welcomePage = html.toString();

                welcomePage = welcomePage.replace('{{README}}', marked(README));
                welcomePage = welcomePage.replace('{{CHANGELOG}}', marked(CHANGELOG));
                welcomePage = welcomePage.replace('{{TROUBLESHOOTING}}', marked(TROUBLESHOOTING));

                panel.title = 'Explorer Exclude Welcome';
                panel.webview.html = welcomePage;
            }

        });
    }
}

module.exports = WelcomePane;