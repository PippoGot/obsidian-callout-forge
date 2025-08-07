import { CalloutForgeError } from "../utils/errors";
import { SourceTemplate, TokenizedTemplate } from "../utils/types";
import { HandlebarSyntaxLibrary, HandlebarSyntaxName, SYNTAX_LIBRARY } from "./handlebar";
import { HandlebarToken, TextToken } from "./token";

export class TemplateParser {
    private library: HandlebarSyntaxLibrary = new Map(SYNTAX_LIBRARY);

    constructor() { }

    // Parse the SourceTemplate to obtain a RawTemplate
    public parse(source: SourceTemplate): TokenizedTemplate {
        // Get the regex with all the syntax rules
        const masterRegex = this.buildMasterRegex();

        // Initialize cycle variables
        let index = 0;
        let tokens = [];
        let match: RegExpExecArray | null;

        // Parse the source using the master regex
        while ((match = masterRegex.exec(source)) !== null) {
            // Add the text before the match to a TextToken
            const token = this.tokenBeforeMatch(index, match, source);
            if (token) tokens.push(token);

            // Add the HandlebarToken
            tokens.push(this.tokenFromMatch(match));

            // Updates the index
            index = match.index + match[0].length;
        }

        // Add the remaining text after the last match to a TextToken
        const token = this.tokenAfterParse(index, source);
        if (token) tokens.push(token);

        // Return the parsed template
        return tokens as TokenizedTemplate;
    }

    // Compose the full regex from the library, e.g.
    //   (?<required>...)|(?<optional>...)|(?<fallback>...)
    private buildMasterRegex(): RegExp {
        // Merge the syntax regexes into one with named capture groups
        const pattern = Array.from(this.library.entries())
            .map(([name, syntax]) => `(?<${name}>${syntax.regex.source})`)
            .join("|");

        // Return the regex with g flag for global matching
        return new RegExp(pattern, "g");
    }

    // Builds a TextToken with the text before a match
    private tokenBeforeMatch(index: number, match: RegExpExecArray, source: SourceTemplate): TextToken | null {
        if (match.index > index) {
            const text = source.slice(index, match.index);
            return new TextToken(text);
        }
        return null;
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

    // Find which syntax matched
    private identifySyntax(match: RegExpExecArray): HandlebarSyntaxName {
        // Iterates the library keys to find a mathcing syntax
        for (const name of this.library.keys()) {
            if (match.groups?.[name] !== undefined) return name;
        }

        // If no group matched, throw an error indicating no syntax matched
        throw new CalloutForgeError("No syntax in this library matched.");
    }

    // Add remaining plain text after the last match
    private tokenAfterParse(index: number, source: SourceTemplate): TextToken | null {
        if (index < source.length) {
            const text = source.slice(index);
            return new TextToken(text);
        }
        return null;
    }
}