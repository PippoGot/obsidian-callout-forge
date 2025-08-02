import { MarkdownRenderer } from 'obsidian';
import { ObsidianRenderingContext } from './types';

// Function to render markdown to HTML using Obsidian API
export async function renderMarkdownString(markdownSource: string, context: ObsidianRenderingContext): Promise<string> {
    // Create a dummy div element to render into
    const htmlDummy = document.createElement("div");

    // Render the markdown into the dummy element using Obsidian API
    await MarkdownRenderer.render(context.app, markdownSource, htmlDummy, context.sourcePath, context.plugin);

    // Create a serializer to get the HTML string
    const serializer = new XMLSerializer();

    // Return the serialized element
    return serializer.serializeToString(htmlDummy);
}