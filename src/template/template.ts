import { MarkdownRenderedProperty } from "rendering/types";
import { CalloutForgeError } from "../utils/errors";
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
    constructor(sourceString: string) {
        this._sourceString = sourceString.trim();
        this._build();
    }

    // Method to build the template, i.e. populate the tokens array
    private _build(): void {
        // Parse the template string to extract token matches (detailed objects)
        const tokenMatches = Template._scanTemplateString(this._sourceString);

        // Array to hold unique tokens after conflict checks
        const tokens: Token[] = [];

        // Iterate through each token match to check for conflicts
        for (const { token } of tokenMatches) {
            // Check if a token with the same name already exists in the tokens array
            const existingToken = tokens.find(t => t.name === token.name);

            if (existingToken) {
                // If the token subclasses differ, throw an error (conflicting types)
                if (!existingToken.isSameSubclass(token)) {
                    throw new CalloutForgeError(
                        `Token conflict: Token '${token.name}' exists with a different type.`
                    );
                }

                // If the tokens are not equivalent (different default values, etc.), throw an error
                if (!existingToken.isEquivalentTo(token)) {
                    throw new CalloutForgeError(
                        `Token conflict: Token '${token.name}' exists with different properties.`
                    );
                }

                // If equivalent, no action needed, just continue
            } else {
                // If no existing token with this name, add current token to array
                tokens.push(token);
            }
        }

        this._tokens = tokens;
    }

    // Static method to build a Template instance from a source string
    // This method is used to create a Template instance without needing to call the constructor directly
    static fromString(sourceString: string): Template {
        // Create a new Template instance with the source string
        const template = new Template(sourceString);

        // Return the built template instance
        return template;
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
                    const innerMatch = syntax.regex.exec(match[0]);

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

    // Method to check if the template has a specific token
    hasToken(tokenName: string): boolean {
        return this.tokens.some(token => token.name === tokenName);
    }

    // Method to get a token by its name
    getToken(tokenName: string): Token {
        if (!this.hasToken(tokenName)) {
            throw new CalloutForgeError(`Token '${tokenName}' not found in the template.`);
        }
        return this.tokens.find(t => t.name === tokenName)!;
    }

    // Fill method to substitute rendered properties into the normalized template string
    fill(properties: MarkdownRenderedProperty[]): string {
        const renderedMap = new Map<string, string>();
        for (const prop of properties) {
            renderedMap.set(prop.name.trim(), prop.value);
        }

        let filled = this.normalizedTemplateString;

        const missingTokens: string[] = [];

        for (const token of this.tokens) {
            const key = token.name;
            const placeholder = `{{ ${key} }}`;

            if (!renderedMap.has(key)) {
                missingTokens.push(key);
                continue;
            }

            const renderedValue = renderedMap.get(key)!;

            // Escape special characters for use in regex
            const escapedPlaceholder = placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedPlaceholder, 'g');

            filled = filled.replace(regex, renderedValue);
        }

        if (missingTokens.length > 0) {
            throw new CalloutForgeError(`Missing rendered values for tokens: ${missingTokens.join(', ')}`);
        }

        return filled;
    }
}
