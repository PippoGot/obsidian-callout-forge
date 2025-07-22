import { App, MarkdownRenderer, Plugin } from 'obsidian'; // Import Obsidian API classes

// Split a string on the first occurrence of a regex pattern
function splitOnFirstRegex(input: string, regex: RegExp): [string, string] {
	// Use regex to find the first match and its index
	// If no match is found, return the original string and an empty string
	const match = input.match(regex);
	const index = input.search(regex);

	if (match && index >= 0) {
		const before = input.slice(0, index);
		const after = input.slice(index + match[0].length);
		return [before, after];
	}

	return [input, ""];
}

// Function to parse configuration string into a dictionary
function parseConfigToDict(config: string): Record<string, string> {
	// Convert configuration string to a dictionary
	return Object.fromEntries(
		config.split("\n").map(line => {
			const [key, ...rest] = line.split(":");
			return [key.trim(), rest.join(":").trim()];
		})
	);
}

// Function to get the template HTML string from the app's vault
async function getTemplateHTMLString(app: App, templatePath: string): Promise<string> {
	// Check if the template file exists
	const templateFileExists = await app.vault.adapter.exists(templatePath);
	if (!templateFileExists) {
		throw new CalloutForgeError(`Template file '${templatePath}' does not exist.`);
	}
	// Read and return the template HTML string
	return await app.vault.adapter.read(templatePath);
}

// Function to render markdown to HTML and append it to the target element
async function renderMarkdownToHTML(app: App, markdown: string, sourcePath: string, plugin: Plugin): Promise<string> {
	// Create a new div element to render into
	const el = document.createElement("div");

	// Render the markdown into the element
	await MarkdownRenderer.render(app, markdown, el, sourcePath, plugin);

	// Return the inner HTML of the element
	return el.innerHTML;
}

// Custom error class for CalloutForge errors
// This allows for better error handling and debugging
class CalloutForgeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CalloutForgeError";
	}
}

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
	private async processCodeBlock(source: string, el: HTMLElement, ctx: any): Promise<void> {
		try {
			// Get the codeblock source string and trims excess spaces
			const codeBlockSource = source.trim();

			// Splits the source into configuration and content parts
			// The configuration is the first part before the first "---" occurrence
			// The content is the rest of the string
			const [config, content] = splitOnFirstRegex(codeBlockSource, /\n---\n/);
			// If no configuration is provided, throw an error
			if (!config) {
				throw new CalloutForgeError("No configuration provided in the code block.");
			}

			// Parse the configuration into a dictionary
			// Each line in the configuration should be in the format "key: value"
			const configDict = parseConfigToDict(config);
			// Append content to the configuration dictionary
			if (content) {
				configDict.content = content.trim();
			}
			// If "template" is not a key in the configuration or has no value, throw an error
			if (!configDict.template || configDict.template.trim() === "") {
				throw new CalloutForgeError("No template specified in the configuration.");
			}

			// Get the template HTML string from the plugin's HTML folder
			const templateHTMLString = await getTemplateHTMLString(this.app, `${this.plugin.HTMLFolderPath}/${configDict.template}.html`);

			// Fill the template with rendered values from the configuration
			const filledHTMLTemplateString = await this.fillTemplateWithRenderedValues(templateHTMLString, configDict);

			// Set the wrapper class for the element
			el.className = "callout-forge-wrapper";
			// Render the filled HTML template into the element
			await MarkdownRenderer.render(
				this.app,                // Obsidian app instance
				filledHTMLTemplateString,// HTML to render
				el,                      // Target element
				ctx.sourcePath,          // Source path for context
				this.plugin              // Plugin instance
			);
		}
		catch (error) {
			// If an error occurs, log it and throw a CalloutForgeError
			console.error("Callout Forge Error:", error.message);

			const errorCallout = el.createDiv({ cls: 'callout callout-danger' });
			errorCallout.createDiv({ cls: 'callout-title', text: 'CalloutForge Error' });
			errorCallout.createDiv({ cls: 'callout-content', text: error.message });
		}
	}

	private async fillTemplateWithRenderedValues(template: string, values: Record<string, string>): Promise<string> {
		// Initialize the rendered template with the original template
		let result = template;

		// Iterate over each key in the values object
		for (const key in values) {
			// Build the regex for the placeholder
			// This regex matches {{ key }} where key is the current key
			const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, "g");

			// Render the value as markdown
			const rendered = await renderMarkdownToHTML(
				this.app,
				values[key],
				this.app.workspace.getActiveFile()?.path || "",
				this.plugin
			);

			// Replace the placeholder in the result with the rendered value
			// This replaces all occurrences of the placeholder in the template
			result = result.replace(placeholderRegex, rendered);
		}

		return result;
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
