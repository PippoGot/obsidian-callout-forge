import { CalloutForgeError } from "../utils/errors";
import { HandlebarSyntaxLibrary, HandlebarSyntaxName, SYNTAX_LIBRARY } from "./handlebar";
import { Template } from "./template";
import { HandlebarToken, TextToken, Token } from "./token";

export class TemplateParser {
    private index: number = 0;
    private tokens: Token[] = [];
    private library: HandlebarSyntaxLibrary = new Map(SYNTAX_LIBRARY);

    constructor(private source: string) {
        this.parse();
    }

    // Static method to obtain a Tmeplate from a source string
    public static fromString(source: string): Template {
        const parser = new TemplateParser(source);
        return parser.template;
    }

    // Parse the source string to obtain a list of tokens
    private parse(): void {
        // Get the regex with all the syntax rules
        const masterRegex = this.buildMasterRegex();

        // Resets the index and token list
        this.resetState();

        // Parse the source using the regex
        let match: RegExpExecArray | null;
        while ((match = masterRegex.exec(this.source)) !== null) {
            // Add the text before the match to a TextToken
            this.addTextBeforeMatch(match);

            // Find out which handlebar matched and build the correpsonding token
            const handlebarToken = this.tokenFromMatch(match);

            // Add the HandlebarToken
            this.tokens.push(handlebarToken);

            // Updates the index
            this.index = match.index + match[0].length;
        }

        // Adds the remaining text to a final TextToken
        this.addRemainingText();
    }

    // Compose the full regex from the library, e.g.
    //   (?<required>...)|(?<optional>...)|(?<fallback>...)
    private buildMasterRegex(): RegExp {
        // merge the syntax regexes into one with named capture groups
        const pattern = Array.from(this.library.entries())
            .map(([name, syntax]) => `(?<${name}>${syntax.regex.source})`)
            .join("|");

        // Return the regex with g flag for global matching
        return new RegExp(pattern, "g");
    }

    // Reset the parser state (used before parsing)
    private resetState(): void {
        this.index = 0;
        this.tokens = [];
    }

    // Add plain text before a match
    private addTextBeforeMatch(match: RegExpExecArray): void {
        if (match.index > this.index) {
            const text = this.source.slice(this.index, match.index);
            this.tokens.push(new TextToken(text));
        }
    }

    // Find which syntax matched
    private identifySyntax(match: RegExpExecArray): HandlebarSyntaxName {
        // Iterates the library keys to find a mathcing syntax
        for (const name of this.library.keys()) {
            if (match.groups?.[name] !== undefined) return name;
        }

        // If no group matched, throw an error indicating no syntax matched
        throw new CalloutForgeError("No syntax in this library matched.");
    }

    // Create a token from the match
    private tokenFromMatch(match: RegExpExecArray): HandlebarToken {
        // Firstly find which syntax matched
        const syntaxName = this.identifySyntax(match);
        const syntax = this.library.get(syntaxName);

        // Then if a syntax is found create the token using its intrinsic method
        if (syntax) {
            // Extract the substring that matched
            const matchedText = match[0];

            // Re-run the syntax's own regex to get the correct capture groups
            const innerMatch = syntax.regex.exec(matchedText);
            if (!innerMatch) {
                throw new CalloutForgeError("Syntax regex did not match its own substring.");
            }

            return syntax.toToken(innerMatch);
        }
        // Otherwise, throw an error
        throw new CalloutForgeError("Could not find a matching syntax in this library.")
    }

    // Add remaining plain text after the last match
    private addRemainingText(): void {
        if (this.index < this.source.length) {
            const text = this.source.slice(this.index);
            this.tokens.push(new TextToken(text));
        }
    }

    // Return the extracted template from the source string
    get template(): Template { return new Template(this.tokens); }
}