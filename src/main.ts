import { loadTemplateString } from "template-engine/file-loader";

import { App, MarkdownPostProcessorContext, MarkdownRenderer, Plugin, sanitizeHTMLToDom } from 'obsidian';

import { CodeblockParser } from "codeblock-engine/parser";
import { TemplateParser } from "template-engine/parser";
import { CalloutForgeError } from "utils/errors";

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
			// 1) Parse codeblock to extract pairs (key: markdown value)
			const pairs = CodeblockParser.fromString(source);

			// 2) Obtain filepath of the requested template
			const filename = pairs.find(pair => pair.key === "template");
			if (!filename) {
				throw new CalloutForgeError("Codeblock has no template property.");
			}

			// 3) Read the HTML template
			const templateString = await loadTemplateString(this.app, `${this.plugin.HTMLFolderPath}/${filename.value}.html`);

			// 4) Parse template string to obtain Template object
			const template = TemplateParser.fromString(templateString);

			// 5) Compile the template using the rendered value obtained from the codeblock
			// this method ignores pairs not appearing in the template string
			// throws error if a value is not provided (either by codeblock or fallback)
			// wraps the markdown in a div with a special class to later render it
			// substitutes the values accordingly with the placeholders
			// and finally joins the text in a single string
			const compiledTemplate = template.compile(pairs);

			// 6) Sanitize the compiled HTML string and builds the DOM
			const sanitizedTemplate = sanitizeHTMLToDom(compiledTemplate);

			// 7) Append the constructed DOM to the wrapper element of this plugin
			wrapperHtmlElement.className = "callout-forge-wrapper";
			wrapperHtmlElement.appendChild(sanitizedTemplate);

			// 8) Finally renders the markdown elements wrapped by the special div
			const mdBlocks = wrapperHtmlElement.querySelectorAll<HTMLElement>(".cf-markdown");
			for (const block of Array.from(mdBlocks)) {
				const mdSource = block.textContent ?? "";
				block.empty();
				await MarkdownRenderer.render(this.app, mdSource, block, ctx.sourcePath, this.plugin);
			}
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
