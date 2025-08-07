import { Codeblock, CompiledTemplate, TokenizedTemplate } from "utils/types";
import { HandlebarToken, TextToken } from "./token";

export class TemplateCompiler {
    constructor() { }

    // Returns a ready-to-render HTML string, casted as a CompiledTemplate
    public compile(template: TokenizedTemplate, codeblock: Codeblock): CompiledTemplate {
        // Build quick lookup for pairs
        const pairMap = new Map(codeblock.map(pair => [pair.key, pair]));

        // Transform all tokens
        const compiledTokens = template.map(token => {
            if (token instanceof HandlebarToken) {
                const pair = pairMap.get(token.key);
                return token.normalize(pair);
            }
            return token as TextToken;
        });

        // Join all text together
        const compiledTemplate = compiledTokens.map(token => (token as TextToken).content).join("");

        return compiledTemplate as CompiledTemplate;
    }
}