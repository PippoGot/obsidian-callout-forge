import { CodeblockProperty } from 'codeblock-parser/types';
import { MarkdownRenderer } from 'obsidian';
import { MarkdownRenderedProperty, RenderingContext } from './types';

// Function to render markdown to HTML using Obsidian API
export async function renderMarkdownString(markdownSource: string, context: RenderingContext): Promise<string> {
    // Create a dummy div element to render into
    const htmlDummy = document.createElement("div");

    // Render the markdown into the dummy element using Obsidian API
    await MarkdownRenderer.render(context.app, markdownSource, htmlDummy, context.sourcePath, context.plugin);

    // Create a serializer to get the HTML string
    const serializer = new XMLSerializer();

    // Return the serialized element
    return serializer.serializeToString(htmlDummy);
}

export async function renderCodeblockProperties(properties: CodeblockProperty[], context: RenderingContext): Promise<MarkdownRenderedProperty[]> {
    let renderedProperties: MarkdownRenderedProperty[] = [];
    for (const property of properties) {
        const renderedValue = await renderMarkdownString(property.value, context);
        const renderedProperty = new MarkdownRenderedProperty(property.name, renderedValue);
        renderedProperties.push(renderedProperty);
    }

    return renderedProperties;
}