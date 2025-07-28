import { loadTemplateString } from "template";

import { App, MarkdownPostProcessorContext, Plugin, sanitizeHTMLToDom } from 'obsidian';

import { CodeblockParser } from "codeblock-parser/parser";
import { normalizeCodeblockProperties } from "codeblock-parser/types";
import { CalloutForgeError } from "errors";
import { renderCodeblockProperties } from "rendering/renderer";
import { Template } from "template/template";

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
	private async processCodeBlock(source: string, wrapperHtmlElement: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
		try {
			// Order of operations:
			// 1) Parse codeblock to extract properties
			const properties = CodeblockParser.parseProperties(source);

			// 2) Obtain filepath of the requested template
			const filename = properties.find(property => property.name === "template");
			if (!filename) {
				throw new CalloutForgeError("Codeblock has no template property.");
			}

			// 3) Read the HTML template
			const templateString = await loadTemplateString(this.app, `${this.plugin.HTMLFolderPath}/${filename.value}.html`);

			// 4) Parse template to extract template tokens
			const template = Template.fromString(templateString);
			const tokens = template.tokens;

			// 5) Filter properties to keep only the ones in the template
			const normalizedProperties = normalizeCodeblockProperties(properties, tokens);

			// 6) Render property values from markdown to HTML using obsidian API
			const context = { app: this.app, plugin: this.plugin, sourcePath: ctx.sourcePath };
			const renderedProperties = await renderCodeblockProperties(normalizedProperties, context);

			// 7) Replace the rendered content in the placeholders
			const filledTemplate = template.fill(renderedProperties);

			// 8) Sanitize the compiled HTML string
			const sanitizedTemplate = sanitizeHTMLToDom(filledTemplate);

			// 9) Render the final element
			wrapperHtmlElement.className = "callout-forge-wrapper";
			wrapperHtmlElement.appendChild(sanitizedTemplate);
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
