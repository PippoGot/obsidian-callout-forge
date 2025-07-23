import { App, MarkdownRenderer, Plugin } from 'obsidian';

// Function to render markdown to HTML
export async function renderMarkdownString(app: App, plugin: Plugin, markdown: string, sourcePath: string): Promise<string> {
    // Create a new div element to render into
    const htmlElement = document.createElement("div");

    // Render the markdown into the element
    await MarkdownRenderer.render(app, markdown, htmlElement, sourcePath, plugin);

    // Return the inner HTML of the element
    return htmlElement.innerHTML;
}