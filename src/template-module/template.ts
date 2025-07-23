import { CalloutForgeError } from "errors";
import { DefaultedToken, OptionalToken, RequiredToken, Token, TokenMatch, TokenSyntax } from "./token";

// Class representing the data structure for template module
// This class is used to parse and manage template parameters (known as tokens)
export class Template {
    // The original template string
    private _sourceString: string;
    get sourceString(): string { return this._sourceString; }

    // Array of tokens parsed from the template string
    private _tokens: Token[];
    get tokens(): Token[] { return this._tokens; }

    // Static property to hold the token syntaxes
    private static _tokenSyntaxes: TokenSyntax[] = [
        {   // Token syntax for required tokens
            name: "required",
            regex: /\{\{\s*([a-zA-Z\-]+)\s*\}\}/,
            extract: (match) => new RequiredToken(match[1])
        },
        {   // Token syntax for optional tokens
            name: "optional",
            regex: /\{\{\s*([a-zA-Z\-]+)\s*\?\s*\}\}/,
            extract: (match) => new OptionalToken(match[1])
        },
        {   // Token syntax for optional tokens with default values
            name: "default",
            regex: /\{\{\s*([a-zA-Z\-]+)\s*\|\s*([^\}]+)\s*\}\}/,
            extract: (match) => new DefaultedToken(match[1], match[2])
        }
    ]

    // Constructor to initialize the Template instance
    constructor(sourceString: string, tokens: Token[]) {
        this._sourceString = sourceString;
        this._tokens = tokens;
    }

    // Static method to construct a Template instance from a raw template string
    static build(templateString: string): Template {
        // Trim leading/trailing whitespace from the template string
        templateString = templateString.trim();

        // Parse the template string to extract token matches
        const tokenMatches = Template._scanTemplateString(templateString);

        // Extract Token objects from the matches
        const tokens = tokenMatches.map(m => m.token);

        // Return a new Template instance with the original string and parsed tokens
        return new Template(templateString, tokens);
    }

    // Static helper method that scans the template string and returns detailed token matches
    private static _scanTemplateString(templateString: string): TokenMatch[] {
        // Array to collect all token matches with metadata
        const matches: TokenMatch[] = [];

        // Build a list of regex groups, each corresponding to a named syntax
        const groupPatterns = Template._tokenSyntaxes.map(
            syntax => `(?<${syntax.name}>${syntax.regex.source})`
        );

        // Combine the named group patterns into one global regex
        const combinedRegex = new RegExp(groupPatterns.join('|'), 'g');

        // Create a map from syntax name to its definition for quick lookup
        const syntaxMap = Object.fromEntries(Template._tokenSyntaxes.map(s => [s.name, s]));

        // Execute the combined regex repeatedly on the input string
        let match: RegExpExecArray | null;
        while ((match = combinedRegex.exec(templateString)) !== null) {
            // Iterate through each named group to find which syntax matched
            for (const syntaxName of Object.keys(match.groups || {})) {
                // Only proceed if this particular group actually matched
                if (match.groups![syntaxName]) {
                    // Retrieve the matching syntax object
                    const syntax = syntaxMap[syntaxName];

                    // Re-execute that syntax's individual regex to extract capture groups
                    const innerMatch = new RegExp(syntax.regex.source).exec(match[0]);

                    // If the inner match is valid, construct and store the token match
                    if (innerMatch) {
                        matches.push({
                            token: syntax.extract(innerMatch), // Actual Token object
                            original: match[0],                // Full original matched string
                            index: match.index                 // Start index in the original string
                        });
                    }

                    // Exit inner loop once the correct syntax has been found
                    break;
                }
            }
        }

        // Return all collected token matches with metadata
        return matches;
    }

    // Static method to append new token syntaxes
    static appendTokenSyntax(tokenSyntax: TokenSyntax): void {
        // If the syntax already exists, throw an error
        // This can happen if the name is the same or if the regex is the same
        if (Template._tokenSyntaxes.some(s => s.name === tokenSyntax.name)) {
            throw new CalloutForgeError(`Token syntax with name '${tokenSyntax.name}' already exists.`);
        }
        if (Template._tokenSyntaxes.some(s => s.regex.toString() === tokenSyntax.regex.toString())) {
            throw new CalloutForgeError(`Token syntax with regex '${tokenSyntax.regex}' already exists.`);
        }

        // If no conflict, add the new token syntax to the static array
        Template._tokenSyntaxes.push(tokenSyntax);
    }

    // Returns the normalized version of the template string,
    // where all tokens are converted to the required syntax format ({{ name }})
    get normalizedTemplateString(): string {
        // Re-scan the original template string to get all token matches
        const tokenMatches = Template._scanTemplateString(this.sourceString);

        // Start with the original string
        let normalized = this.sourceString;

        // Iterate through each matched token
        for (const { original, token } of tokenMatches) {
            // Escape special regex characters in the original match string
            const escapedPattern = original.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

            // Create a regex to find all occurrences of this exact original token string
            const matchRegex = new RegExp(escapedPattern, 'g');

            // Replace each matched token string with the normalized required format
            normalized = normalized.replace(matchRegex, `{{ ${token.name} }}`);
        }

        // Return the final normalized string
        return normalized;
    }
}
