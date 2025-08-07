import { App, Plugin, normalizePath } from "obsidian";

import { CalloutForgeError } from "utils/errors";
import { Codeblock, CompiledTemplate, SourceTemplate, TokenizedTemplate } from "utils/types";
import { TemplateCompiler } from "./compiler";
import { TemplateParser } from "./parser";

export class TemplateManager {
    private parser: TemplateParser = new TemplateParser();
    private compiler: TemplateCompiler = new TemplateCompiler();

    constructor(private app: App, private plugin: Plugin) { }

    // Returns a CompiledTemplate string from a Codeblock
    public async extract(codeblock: Codeblock): Promise<CompiledTemplate> {
        const filepath = this.getFilepath(codeblock);
        const source = await this.load(filepath);
        const raw = this.build(source);
        return this.compile(raw, codeblock);
    }

    // Get the basename of a template file from a Codeblock object
    // CHANGE THIS FUNCTION WHEN IMPLEMENTING TEMPLATE FOLDER SELECTION
    private getFilepath(codeblock: Codeblock): string {
        // Get the value from the "template" parameter of the Codeblock
        const basename = codeblock.find(pair => pair.key === "template")?.value;
        if (!basename) {
            throw new CalloutForgeError("Codeblock has no template property.");
        }

        // Build the file path
        return normalizePath(`HTML Templates/${basename}.md`);
    }

    // Load the file from the vault and return the content as a string
    // CHANGE THIS FUNCTION WHEN IMPLEMENTING CACHING
    private async load(filepath: string): Promise<SourceTemplate> {
        // Get the file
        const file = this.app.vault.getFileByPath(filepath);
        if (!file) {
            // If the file does not exist throw error
            throw new CalloutForgeError(`Template file '${filepath}' does not exist.`);
        }

        // Return the file content
        return await this.app.vault.read(file) as SourceTemplate;
    }

    // Build and return the Template object
    private build(source: SourceTemplate): TokenizedTemplate {
        return this.parser.parse(source);
    }

    // Compile a template object from a list of parameters
    private compile(template: TokenizedTemplate, codeblock: Codeblock): CompiledTemplate {
        return this.compiler.compile(template, codeblock);
    }
}