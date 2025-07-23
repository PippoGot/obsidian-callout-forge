import { CalloutForgeError } from "errors";
import { renderMarkdownString } from "rendering";
import { TemplateParameter } from "types";

import { App, Plugin } from "obsidian";

// Function to get the template HTML string from the app's vault
export async function loadTemplateString(app: App, templatePath: string): Promise<string> {
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
export function normalizeTemplateString(htmlTemplateString: string): string {
    // Copy the template string to avoid modifying the original
    const normalizedTemplateString = htmlTemplateString.trim();

    // Use regex to find all placeholders in the format {{ key? }} or {{ key | default }}
    const placeholderRegex = /{{\s*([\w\-]+)(\?\s*|\s*\|\s*[^}]+)?\s*}}/g;

    // Replace all placeholders with the required format {{ key }}
    return normalizedTemplateString.replace(placeholderRegex, (match, key) => {
        // Return the placeholder in the required format
        return `{{ ${key} }}`;
    });
}

// Function to compile the template string with the provided parameters
export async function compileTemplateString(app: App, plugin: Plugin, htmlTemplateString: string, filteredDict: Record<string, string>): Promise<string> {
    // Initialize the rendered template with the original template string
    // This will be modified as we replace placeholders with actual values
    let outputHtmlString = normalizeTemplateString(htmlTemplateString);

    // Iterate over each key in the configDict object
    for (const key in filteredDict) {
        // Build the regex for the placeholder
        // This regex matches {{ key }} where key is the current key
        const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, "g");

        // Render the value as markdown
        const renderedHtmlString = await renderMarkdownString(app, plugin, filteredDict[key], app.workspace.getActiveFile()?.path || "");

        // Replace the placeholder in the result with the rendered value
        // This replaces all occurrences of the placeholder in the template
        outputHtmlString = outputHtmlString.replace(placeholderRegex, renderedHtmlString);
    }

    return outputHtmlString;
}

// Function to extract template parameters from a template string
// This function scans the template for placeholders and returns an array of parameters structures
export function parseTemplateParameters(template: string): TemplateParameter[] {
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

// Function to gather and filter parameters from the codeblock and the default values
export function gatherAndFilterParameters(configDict: Record<string, string>, templateParameters: TemplateParameter[]): Record<string, string> {
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