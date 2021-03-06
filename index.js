'use strict';

const { LanguageClient, SettingMonitor, ExecuteCommandRequest } = require('vscode-languageclient');
const { workspace, commands: Commands, window: Window } = require('vscode');

const { activationEvents } = require('./package.json');

const documentSelector = [];

for (const activationEvent of activationEvents) {
	if (activationEvent.startsWith('onLanguage:')) {
		const language = activationEvent.replace('onLanguage:', '');

		documentSelector.push({ language, scheme: 'file' }, { language, scheme: 'untitled' });
	}
}

exports.activate = ({ subscriptions }) => {
	const serverPath = require.resolve('./server.js');

	const client = new LanguageClient(
		'stylelint',
		{
			run: {
				module: serverPath,
			},
			debug: {
				module: serverPath,
				options: {
					execArgv: ['--nolazy', '--inspect=6004'],
				},
			},
		},
		{
			documentSelector,
			diagnosticCollectionName: 'stylelint',
			synchronize: {
				configurationSection: 'stylelint',
				fileEvents: workspace.createFileSystemWatcher(
					'**/{.stylelintrc{,.js,.json,.yaml,.yml},stylelint.config.js,.stylelintignore}',
				),
			},
		},
	);

	subscriptions.push(
		Commands.registerCommand('stylelint.executeAutofix', () => {
			const textEditor = Window.activeTextEditor;

			if (!textEditor) {
				return;
			}

			const textDocument = {
				uri: textEditor.document.uri.toString(),
				version: textEditor.document.version,
			};
			const params = {
				command: 'stylelint.applyAutoFix',
				arguments: [textDocument],
			};

			client.sendRequest(ExecuteCommandRequest.type, params).then(undefined, () => {
				Window.showErrorMessage(
					'Failed to apply styleint fixes to the document. Please consider opening an issue with steps to reproduce.',
				);
			});
		}),
	);
	subscriptions.push(new SettingMonitor(client, 'stylelint.enable').start());
};
