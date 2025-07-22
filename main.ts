import { MarkdownRenderer, Plugin } from 'obsidian';

// TODO: command to open the template folder
// TODO: command to open an editor and create templates directly from obsidian
// TODO: command to move a note to the HTML folder and convert it into a template?

function parseCalloutBlock(source: string): Record<string, string> {
	const lines = source.trim().split("\n");		// list of lines inside the codeblock
	const config: Record<string, string> = {};		// key-value list of the parameters
	let contentKey = "content";						// content key
	let inContent = false;							// boolean to check if we are in the content section
	let contentLines: string[] = [];				// list of strings in the content section

	for (const line of lines) {
		// Starting content space (not in content but content keyword detected)
		if (!inContent && line.trim().startsWith(`${contentKey}:`)) {
			// Push the rest of the line to content lines array and sets the inContent boolean
			const contentFirstLine = line.substring(line.indexOf(":") + 1).trim();
			if (contentFirstLine) contentLines.push(contentFirstLine);
			inContent = true;
		} else if (inContent) {
			// Other content lines are pushed in the array as well
			contentLines.push(line);
		} else {
			// Non-content lines are separated as key-value
			const [key, ...rest] = line.split(":");
			if (rest.length > 0) {
				config[key.trim()] = rest.join(":").trim();
			}
		}
	}

	// If there's at least one content line, join the lines
	if (contentLines.length > 0) {
		config[contentKey] = contentLines.join("\n");
	}

	return config;
}

function parseHTMLTemplate(template: string): { required: string[]; optional: string[]; } {
	const required = new Set<string>();			// required parameters list
	const optional = new Set<string>();			// optional parameters list

	const regex = /{{\s*(\??)([\w-]+)\s*}}/g;	// regex for the parameter matching
	let match;									// boolean to check regex match

	// For each regex match
	while ((match = regex.exec(template)) !== null) {
		// Get the parameter key and wether it is optional
		const isOptional = match[1] === "?";
		const key = match[2];

		// Append the key to the corresponding array to return
		if (isOptional) {
			optional.add(key);
		} else {
			required.add(key);
		}
	}

	return { required: Array.from(required), optional: Array.from(optional) };
}

function fillHTMLTemplate(template: string, values: Record<string, string>): string {
	let rendered = template;

	for (const key in values) {
		const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
		rendered = rendered.replace(regex, values[key]);
	}

	return rendered;
}

async function fillTemplateWithRenderedValues(
	template: string,
	values: Record<string, string>,
	container: HTMLElement,
	plugin: Plugin
): Promise<string> {
	let renderedTemplate = template;

	for (const key in values) {
		const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, "g");

		// Crea un contenitore temporaneo per il rendering
		const tempDiv = document.createElement("div");

		await MarkdownRenderer.render(
			plugin.app,
			values[key],
			tempDiv,
			plugin.app.workspace.getActiveFile()?.path || "",
			plugin
		);

		const renderedHTML = tempDiv.innerHTML;

		renderedTemplate = renderedTemplate.replace(placeholderRegex, renderedHTML);
	}

	return renderedTemplate;
}

export default class CalloutForgePlugin extends Plugin {
	pluginFolderPath = this.manifest.dir;
	HTMLFolderPath = `${this.pluginFolderPath}/HTML`;
	CSSFolderPath = `${this.pluginFolderPath}/CSS`;

	templateHTML: string = "";

	async onload() {
		// If not present, creates the folders for the HTML templates
		// TODO: setting to include other folders or change the folder location
		const HTMLexists = await this.app.vault.adapter.exists(this.HTMLFolderPath)
		if (!HTMLexists) {
			await this.app.vault.adapter.mkdir(this.HTMLFolderPath);
		}

		// Get all the codeblocks "calloutforge"
		this.registerMarkdownCodeBlockProcessor("calloutforge", async (source, el, ctx) => {
			// Parse the block to obtain the parameters
			const config = parseCalloutBlock(source);

			try {
				// If the 'template' field is not in the code block raise an error
				if (!("template" in config)) {
					throw new Error("Parameter 'template' is needed to locate the template file.");
				}

				// Build the template path, then check if it exists
				const templatePath = `${this.HTMLFolderPath}/${config["template"]}.html`;
				const fileExist = await this.app.vault.adapter.exists(templatePath);
				if (!fileExist) {
					throw new Error(`Template file '${templatePath}' doesn't exist.`)
				}

				// Read and parse template file to get the HTML string and required and optional parameters
				// TODO: EXTEND TO LIST ALL THE MISSING PARAMETERS
				// TODO: EXTEND TO HAVE DEFAULT VALUES
				this.templateHTML = await this.app.vault.adapter.read(templatePath);
				const { required, optional } = parseHTMLTemplate(this.templateHTML);
				for (const idx in required) {
					if (!(required[idx] in config)) {
						throw new Error(`Required parameter '${required[idx]}' is missing in the codeblock configuration.`)
					}
				}

				// Compile the HTML string with the values obtained from the codeblock
				this.templateHTML = await fillTemplateWithRenderedValues(this.templateHTML, config, el, this);

			} catch (err) {
				// If any error is thrown, it is printed in the console and the callout displays the message
				console.error(err);
				this.templateHTML = `<div style="color:red;">Callout Forge Error: ${err.message}</div>`;
			}

			// Finally renders the callout (also wraps it in a div for easy css editing)
			let rendered = `<div class="callout-forge-wrapper">${this.templateHTML}</div>`;
			el.innerHTML = rendered;
		});
	}
}
