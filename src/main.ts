import { Plugin } from 'obsidian';

import { CalloutForgeCodeBlockProcessor } from 'plugin/processor';

// Main plugin class
export default class CalloutForgePlugin extends Plugin {
	pluginFolderPath = this.manifest.dir;				// Path to the plugin folder
	HTMLFolderPath = `${this.pluginFolderPath}/HTML`;	// Path to the HTML templates folder

	// Called when the plugin is loaded
	async onload() {
		// Check if folder exists
		const HTMLexists = await this.app.vault.adapter.exists(this.HTMLFolderPath);
		// Create folder if missing
		if (!HTMLexists) {
			await this.app.vault.adapter.mkdir(this.HTMLFolderPath);
		}

		// Register the code block processor
		new CalloutForgeCodeBlockProcessor(this.app, this);
	}

	onunload(): void {
		// Cleanup logic when the plugin is unloaded
		// Currently, no specific cleanup is needed
		// console.log("Callout Forge Plugin unloaded.");
	}
}
