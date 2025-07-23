import { App, MarkdownRenderer, Plugin } from 'obsidian'; // Import Obsidian API classes

// Split a string on the first occurrence of a regex pattern
function splitStringOnFirstOccurrence(input: string, regex: RegExp): [string, string] {
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

// Function to extract configuration dictionary from the source string
// This function expects the source to be in the format:
// key1: value1
// key2: value2
// ---
// content starts here
function extractConfigDictFromSource(source: string): Record<string, string> {
	// Split the source into configuration and content parts
	// The configuration is the first part before the first "---" occurrence
	// The content is the rest of the string
	const [config, content] = splitStringOnFirstOccurrence(source, /^\s*---\s*$/m);

	// If no configuration is provided, throw an error
	if (!config) {
		throw new CalloutForgeError("No configuration provided in the code block.");
	}

	// Parse the configuration into a dictionary
	const configDict = Object.fromEntries(
		config.split("\n").map(line => {
			const [key, ...rest] = line.split(":");
			return [key.trim(), rest.join(":").trim()];
		})
	);

	// If "template" is not a key in the configuration or has no value, throw an error
	if (!configDict.template || configDict.template.trim() === "") {
		throw new CalloutForgeError("No template specified in the configuration.");
	}

	// Append content to the configuration dictionary if it exists
	if (content.trim() !== "") {
		configDict.content = content.trim();
	}

	return configDict;
}

// Function to get the template HTML string from the app's vault
async function getHtmlTemplateString(app: App, templatePath: string): Promise<string> {
	// Check if the template file exists
	const templateFileExists = await app.vault.adapter.exists(templatePath);
	if (!templateFileExists) {
		throw new CalloutForgeError(`Template file '${templatePath}' does not exist.`);
	}
	// Read and return the template HTML string
	return await app.vault.adapter.read(templatePath);
}

// This function changes all the placeholders to required parameters
// if optional with default, and remnoves them if optional without default
// This is used to create a base template that can be filled with actual values later
function convertTemplateStringToRequired(htmlTemplateString: string): string {
	// Use regex to find all placeholders in the format {{ key? }} or {{ key | default }}
	const placeholderRegex = /{{\s*([\w\-]+)(\?\s*|\s*\|\s*[^}]+)?\s*}}/g;

	// Replace all placeholders with the required format {{ key }}
	return htmlTemplateString.replace(placeholderRegex, (match, key) => {
		// Return the placeholder in the required format
		return `{{ ${key} }}`;
	});
}

// Function to render markdown to HTML
async function renderMarkdownToHtml(app: App, plugin: Plugin, markdown: string, sourcePath: string): Promise<string> {
	// Create a new div element to render into
	const htmlElement = document.createElement("div");

	// Render the markdown into the element
	await MarkdownRenderer.render(app, markdown, htmlElement, sourcePath, plugin);

	// Return the inner HTML of the element
	return htmlElement.innerHTML;
}

async function fillTemplateString(app: App, plugin: Plugin, htmlTemplateString: string, filteredDict: Record<string, string>): Promise<string> {
	// Initialize the rendered template with the original template string
	// This will be modified as we replace placeholders with actual values
	let outputHtmlString = convertTemplateStringToRequired(htmlTemplateString);

	// Iterate over each key in the configDict object
	for (const key in filteredDict) {
		// Build the regex for the placeholder
		// This regex matches {{ key }} where key is the current key
		const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, "g");

		// Render the value as markdown
		const renderedHtmlString = await renderMarkdownToHtml(app, plugin, filteredDict[key], app.workspace.getActiveFile()?.path || "");

		// Replace the placeholder in the result with the rendered value
		// This replaces all occurrences of the placeholder in the template
		outputHtmlString = outputHtmlString.replace(placeholderRegex, renderedHtmlString);
	}

	return outputHtmlString;
}

// Function to gather and filter parameters from the codeblock and the default values
function gatherAndFilterParameters(configDict: Record<string, string>, templateParameters: TemplateParameter[]): Record<string, string> {
	// Create a new object to hold the filtered parameters
	// This will includeonly the parameters that are defined in the template
	// and have a value in the configDict or a default value
	// This ensures that only relevant parameters are included in the final output
	const filteredParams: Record<string, string> = {};

	// iterate over the template parameters
	for (const param of templateParameters) {
		// If the parameter is required, check if it exists in the configDict
		if (param.isRequired) {
			if (configDict[param.key]) {
				// If it exists, add it to the filteredParams
				filteredParams[param.key] = configDict[param.key];
			} else {
				// If it does not exist, throw an error
				throw new CalloutForgeError(`Required parameter '${param.key}' is missing in the block configuration.`);
			}
		} else {
			// If the parameter is optional, check if it exists in the configDict
			if (configDict[param.key]) {
				// If it exists, add it to the filteredParams
				filteredParams[param.key] = configDict[param.key];
			} else if (param.defaultValue) {
				// If it does not exist but has a default value, use that
				filteredParams[param.key] = param.defaultValue;
			}
			// If it does not exist and has no default value, do not add it to filteredParams
		}
	}


	return filteredParams;
}

// Class for template parameters
// This defines the structure of parameters that can be used in templates
class TemplateParameter {
	key: string;
	isRequired: boolean;
	defaultValue?: string;

	// Constructor to initialize the TemplateParameter instance
	// key: the name of the parameter
	// isRequired: whether the parameter is required or optional
	// defaultValue: the default value for the parameter if it is optional
	constructor(key: string, isRequired: boolean, defaultValue?: string) {
		this.key = key;
		this.isRequired = isRequired;
		this.defaultValue = defaultValue;
	}

	// Method to check if two TemplateParameter instances are equal
	// This is used to avoid conflicts when parameters with the same key are defined
	equals(other: TemplateParameter): boolean {
		return (
			this.key === other.key &&
			this.isRequired === other.isRequired &&
			this.defaultValue === other.defaultValue
		);
	}
}

// Function to extract template parameters from a template string
// This function scans the template for placeholders and returns an array of parameters structures
function extractTemplateParameters(template: string): TemplateParameter[] {
	// Create a map to store unique parameters by their keys
	const paramMap: Record<string, TemplateParameter> = {};

	// Helper function to check for conflicts and add parameters to the map
	function checkConflictsAndAdd(param: TemplateParameter) {
		const existing = paramMap[param.key];
		// If a parameter with the same key already exists, check for conflicts
		if (existing) {
			if (!existing.equals(param)) {
				throw new CalloutForgeError(`Conflicting definitions for parameter '${param.key}'.`);
			}
		}
		// If no conflict, add the parameter to the map
		else {
			paramMap[param.key] = param;
		}
	}

	// 1st pass: isRequired parameters: {{ param-name }}
	// Note: this regex matches all placeholders, so to avoid double-counting with others,
	// we exclude those with ? or | in the pattern.
	const isRequiredRegex = /{{\s*([\w\-]+)\s*}}/g;
	let match;
	while ((match = isRequiredRegex.exec(template)) !== null) {
		const key = match[1];
		checkConflictsAndAdd(new TemplateParameter(key, true));
	}

	// 2nd pass: optional without default: {{ param-name? }}
	const optionalNoDefaultRegex = /{{\s*([\w\-]+)\?\s*}}/g;
	while ((match = optionalNoDefaultRegex.exec(template)) !== null) {
		checkConflictsAndAdd(new TemplateParameter(match[1], false, ""));
	}

	// 3rd pass: optional with default: {{ param-name | default-value }}
	const optionalWithDefaultRegex = /{{\s*([\w\-]+)\s*\|\s*(.+?)\s*}}/g;
	while ((match = optionalWithDefaultRegex.exec(template)) !== null) {
		const key = match[1];
		const defaultValue = match[2].trim();

		if (defaultValue === "") {
			throw new CalloutForgeError(`Parameter '${key}' has an empty default value.`);
		}

		checkConflictsAndAdd(new TemplateParameter(key, false, defaultValue));
	}

	return Object.values(paramMap);
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
	private async processCodeBlock(source: string, wrapperHtmlElement: HTMLElement, ctx: any): Promise<void> {
		try {
			// Set the class name for the wrapper element
			wrapperHtmlElement.className = "callout-forge-wrapper";

			// Get the codeblock source string and trims excess spaces
			const codeBlockSource = source.trim();

			// Parse the configuration into a dictionary
			// Each line in the configuration should be in the format "key: value"
			const configDict = extractConfigDictFromSource(codeBlockSource);

			// Get the template HTML string from the plugin's HTML folder
			const htmlTemplateString = await getHtmlTemplateString(this.app, `${this.plugin.HTMLFolderPath}/${configDict.template}.html`);

			// Extract template parameters from the HTML template string
			const templateParameters = extractTemplateParameters(htmlTemplateString);

			// Gather and filter parameters from the configuration dictionary
			const filteredDict = gatherAndFilterParameters(configDict, templateParameters);

			// Fill the template with rendered values from the configuration
			const compiledHtmlTemplateString = await fillTemplateString(this.app, this.plugin, htmlTemplateString, filteredDict);

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
