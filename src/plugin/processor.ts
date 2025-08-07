import { App, MarkdownPostProcessorContext, MarkdownRenderer, Plugin, sanitizeHTMLToDom } from 'obsidian';

import { CodeblockParser } from "codeblock-engine/parser";
import { TemplateManager } from 'template-engine/manager';

export class CalloutForgeCodeBlockProcessor {
    private templateManager: TemplateManager;

    // Constructor to initialize the processor with the plugin and app instances
    // Registers the code block processor for "calloutforge" type
    constructor(private app: App, private plugin: Plugin) {
        this.templateManager = new TemplateManager(this.app, this.plugin);

        this.plugin.registerMarkdownCodeBlockProcessor("calloutforge", this.processCodeBlock.bind(this));
    }

    // Main function to process the code block
    private async processCodeBlock(source: string, wrapperHtmlElement: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
        try {
            // Order of operations:
            // 1) Parse codeblock to extract pairs (key: markdown value)
            const pairs = CodeblockParser.fromString(source);

            // 2) Extract the CompiledTemplate from the Codeblock
            const compiledTemplate = await this.templateManager.extract(pairs);

            // 3) Sanitize the compiled HTML string and builds the DOM
            const sanitizedTemplate = sanitizeHTMLToDom(compiledTemplate);

            // 4) Append the constructed DOM to the wrapper element of this plugin
            wrapperHtmlElement.className = "callout-forge-wrapper";
            wrapperHtmlElement.appendChild(sanitizedTemplate);

            // 5) Finally renders the markdown elements wrapped by the special div
            const mdBlocks = wrapperHtmlElement.querySelectorAll<HTMLElement>(".cf-markdown");
            for (const block of Array.from(mdBlocks)) {
                const mdSource = block.textContent ?? "";
                const temp = document.createElement("div");

                await MarkdownRenderer.render(this.app, mdSource, temp, ctx.sourcePath, this.plugin);

                block.replaceWith(...Array.from(temp.childNodes));
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