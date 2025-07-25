import { stringBisect } from "utils/string-operations";

/**
 * Represents a single property inside a Codeblock.
 * It can contain strings and nested Codeblocks (parsed recursively).
 */
export class CodeblockProperty {
    readonly name: string;
    readonly parent: Codeblock;

    // Content can be strings or nested Codeblocks (to support nesting)
    private _content: (string | Codeblock)[] = [];
    get content(): (string | Codeblock)[] { return this._content; }

    constructor(name: string, content: string, parent: Codeblock) {
        this.parent = parent;
        this.name = name.trim();
        this._build(content);
    }

    /**
     * Parses the content string to find nested codeblocks and
     * splits the content into strings and Codeblock instances.
     */
    private _build(content: string): void {
        let contentCopy = content.trim();
        let [strHead, strTail] = ["", ""];

        // Regex for fenced codeblock with 'calloutforge' marker:
        // Matches fences of at least 3 backticks, exact string 'calloutforge',
        // content inside, then closing fence of same backticks count.
        const codeblockRegex = /(^|\n)(`{3,})calloutforge\n([\s\S]*?)\n\2\n/g;

        let match: RegExpExecArray | null;
        while ((match = codeblockRegex.exec(contentCopy)) !== null) {
            // Split the content at the match (which includes leading newline if any)
            [strHead, strTail] = stringBisect(contentCopy, match[0]).map(s => s.trim());

            if (strHead) {
                this._content.push(strHead);
                contentCopy = strTail;
            }

            // Recursively parse the inner codeblock content
            const codeblock = new Codeblock(match[3], this.parent);
            this._content.push(codeblock);

            // Move parsing window forward
            contentCopy = strTail;
        }

        // Append any remaining content after last codeblock match
        if (contentCopy) this._content.push(contentCopy);
    }
}

/**
 * Represents a Codeblock, consisting of multiple properties.
 * Parses a source string split by a delimiter `---` into key-value pairs,
 * then captures the remaining content as a "content" property.
 */
export class Codeblock {
    readonly parent: Codeblock | undefined;
    readonly sourceString: string;

    private _properties: CodeblockProperty[] = [];
    get properties(): CodeblockProperty[] { return this._properties; }

    constructor(sourceString: string, parent: Codeblock | undefined = undefined) {
        this.parent = parent;
        this.sourceString = sourceString;
        this._build();
    }

    /**
     * Splits the sourceString into header and content at delimiter `---`.
     * Parses header key-value pairs, and creates properties accordingly.
     * Remaining content is added as a special "content" property.
     */
    private _build(): void {
        // Split at delimiter with optional surrounding whitespace
        // Trim spaces so key-value regex matches properly
        const [header, content] = stringBisect(this.sourceString, "\n---\n");

        // Regex to match key-value pairs in the header.
        // Key: letters and dashes, colon, optional spaces.
        // Value: multiline, ends before next key or end of input.
        const keyValueRegex = /(?:^|\n)\s*([a-zA-Z\-]+)\s*:\s*([^\n]*(?:\n(?![a-zA-Z\-]+\s*:).*)*)/g;

        let match: RegExpExecArray | null;
        while ((match = keyValueRegex.exec(header)) !== null) {
            const property = new CodeblockProperty(match[1].trim(), match[2].trim(), this);
            this._properties.push(property);
        }

        // Add remaining content after header as a "content" property
        const contentProperty = new CodeblockProperty("content", content, this);
        this._properties.push(contentProperty);
    }
}
