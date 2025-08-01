import { CalloutForgeError } from "utils/errors";

import { App } from "obsidian";

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