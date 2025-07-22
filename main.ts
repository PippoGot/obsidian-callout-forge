import { MarkdownRenderer, Plugin } from 'obsidian'; // Import Obsidian API classes

// Fills an HTML template with rendered markdown values from the codeblock
async function fillTemplateWithRenderedValues(
	template: string,                // The HTML template string
	values: Record<string, string>,  // Key-value pairs from the codeblock
	htmlFolderPath: string,          // Path to the HTML templates folder
	plugin: Plugin                   // The plugin instance
): Promise<string> {
	// Start with the template
	let renderedTemplate = template;

	// Iterate over each key in the values object
	for (const key in values) {
		// Regex for the placeholder
		const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
		// Get the value for this key
		let value = values[key];

		// Temporary div for rendering
		const tempDiv = document.createElement("div");
		// Render the value as markdown (no nesting)
		await MarkdownRenderer.render(
			plugin.app,                        // Obsidian app instance
			value,                             // Markdown value to render
			tempDiv,                           // Target div for rendering
			plugin.app.workspace.getActiveFile()?.path || "", // Path of the active file
			plugin                            // Plugin instance for context
		);
		// Get the rendered HTML
		const renderedHTML = tempDiv.innerHTML;
		// Replace placeholder with HTML
		renderedTemplate = renderedTemplate.replace(placeholderRegex, renderedHTML);
	}

	// Return the filled template
	return renderedTemplate;
}

// Parses parameters from a codeblock, supporting multi-line values
function parseCalloutForgeParams(source: string): Record<string, string> {
	// Object to store results
	const result: Record<string, string> = {};
	// Current key being processed
	let currentKey: string | null = null;
	// Lines for the current value
	let currentValue: string[] = [];

	// Split source into lines
	const lines = source.split("\n");
	for (const line of lines) {
		// Match 'key: value'
		const keyMatch = line.match(/^(\w[\w\s-]*):\s*(.*)$/);
		if (keyMatch) {
			// Save previous key-value
			if (currentKey) {
				result[currentKey] = currentValue.join("\n").trim();
			}
			// Set new key
			currentKey = keyMatch[1].trim();
			// Start new value
			currentValue = keyMatch[2] ? [keyMatch[2]] : [];
		} else if (currentKey) {
			// Add line to current value
			currentValue.push(line);
		}
	}

	// Save last key-value
	if (currentKey) {
		result[currentKey] = currentValue.join("\n").trim();
	}

	// Return parsed parameters
	return result;
}

// Main plugin class
export default class CalloutForgePlugin extends Plugin {
	// Path to the plugin folder
	pluginFolderPath = this.manifest.dir;
	// Path to the HTML templates folder
	HTMLFolderPath = `${this.pluginFolderPath}/HTML`;

	// Placeholder for template HTML
	templateHTML: string = "";

	// Called when the plugin is loaded
	async onload() {
		// Check if folder exists
		const HTMLexists = await this.app.vault.adapter.exists(this.HTMLFolderPath);
		// Create folder if missing
		if (!HTMLexists) {
			await this.app.vault.adapter.mkdir(this.HTMLFolderPath);
		}

		// Register your code block processor for 'calloutforge'
		this.registerMarkdownCodeBlockProcessor("calloutforge", async (source, el, ctx) => {
			// Parse the block to obtain the parameters
			const config = parseCalloutForgeParams(source);

			try {
				// Require a 'template' parameter
				if (!("template" in config)) {
					throw new Error("Parameter 'template' is needed to locate the template file.");
				}

				// Path to the template file
				const templatePath = `${this.HTMLFolderPath}/${config["template"]}.html`;
				// Check if file exists
				const fileExist = await this.app.vault.adapter.exists(templatePath);
				if (!fileExist) {
					throw new Error(`Template file '${templatePath}' doesn't exist.`);
				}

				// Read template file
				const templateHTML = await this.app.vault.adapter.read(templatePath);

				// Compile the HTML string with the values obtained from the codeblock
				const renderedHTML = await fillTemplateWithRenderedValues(templateHTML, config, this.HTMLFolderPath, this);

				// Set wrapper class
				el.className = "callout-forge-wrapper";
				// Render the final HTML in a wrapper
				await MarkdownRenderer.render(
					this.app,                // Obsidian app instance
					renderedHTML,            // HTML to render
					el,                      // Target element
					ctx.sourcePath,          // Source path for context
					this                     // Plugin instance
				);
			} catch (err) {
				// If error, show message in the note
				el.createDiv({ text: `Callout Forge Error: ${err.message}`, cls: "calloutforge-error" });
				// Log error to console
				console.error("Callout Forge Error:", err);
			}
		});
	}
}
