import { parseCodeBlock } from "codeblock";
import { compileTemplateString, gatherAndFilterParameters, loadTemplateString, parseTemplateParameters } from "template";

import { App, MarkdownRenderer, Plugin } from 'obsidian'; // Import Obsidian API classes


// Codeblock Processor class
export class CalloutForgeCodeBlockProcessor {
	plugin: CalloutForgePlugin;
	app: App;

	// Constructor to initialize the processor with the plugin and app instances
	// Registers the code block processor for "calloutforge" type
	constructor(plugin: CalloutForgePlugin, app: App) {
		this.app = app;
		this.plugin = plugin;
		this.plugin.registerMarkdownCodeBlockProcessor("calloutforge", this.processCodeBlock.bind(this));
	}

	// Main function to process the code block
	private async processCodeBlock(source: string, wrapperHtmlElement: HTMLElement, ctx: any): Promise<void> {
		try {
			// Set the class name for the wrapper element
			wrapperHtmlElement.className = "callout-forge-wrapper";

			// Get the codeblock source string and trims excess spaces
			const codeBlockSource = source.trim();

			// Parse the configuration into a dictionary
			// Each line in the configuration should be in the format "key: value"
			const configDict = parseCodeBlock(codeBlockSource);

			// Get the template HTML string from the plugin's HTML folder
			const htmlTemplateString = await loadTemplateString(this.app, `${this.plugin.HTMLFolderPath}/${configDict.template}.html`);

			// Extract template parameters from the HTML template string
			const templateParameters = parseTemplateParameters(htmlTemplateString);

			// Gather and filter parameters from the configuration dictionary
			const filteredDict = gatherAndFilterParameters(configDict, templateParameters);

			// Fill the template with rendered values from the configuration
			const compiledHtmlTemplateString = await compileTemplateString(this.app, this.plugin, htmlTemplateString, filteredDict);

			// Render the filled HTML template into the element
			await MarkdownRenderer.render(
				this.app,                	// Obsidian app instance
				compiledHtmlTemplateString,	// HTML to render
				wrapperHtmlElement,         // Target element
				ctx.sourcePath,          	// Source path for context
				this.plugin              	// Plugin instance
			);
		}
		catch (error) {
			// If an error occurs, log it and throw a CalloutForgeError
			console.error("Callout Forge Error:", error.message);

			const errorCallout = wrapperHtmlElement.createDiv({ cls: 'callout callout-danger' });
			errorCallout.createDiv({ cls: 'callout-title', text: 'CalloutForge Error' });
			errorCallout.createDiv({ cls: 'callout-content', text: error.message });
		}
	}
}


// Main plugin class
export default class CalloutForgePlugin extends Plugin {
	pluginFolderPath = this.manifest.dir;				// Path to the plugin folder
	HTMLFolderPath = `${this.pluginFolderPath}/HTML`;	// Path to the HTML templates folder

	templateHTML: string = "";							// Placeholder for template HTML

	// Called when the plugin is loaded
	async onload() {
		// Check if folder exists
		const HTMLexists = await this.app.vault.adapter.exists(this.HTMLFolderPath);
		// Create folder if missing
		if (!HTMLexists) {
			await this.app.vault.adapter.mkdir(this.HTMLFolderPath);
		}

		// Register the code block processor
		new CalloutForgeCodeBlockProcessor(this, this.app);
	}

	onunload(): void {
		// Cleanup logic when the plugin is unloaded
		// Currently, no specific cleanup is needed
		console.log("Callout Forge Plugin unloaded.");
	}
}
