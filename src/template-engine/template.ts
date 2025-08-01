import { Pair } from "../rendering/pair";
import { HandlebarToken, TextToken, Token } from "./token";

export class Template {
    constructor(public readonly tokens: Token[]) { }

    // Returns a string of ready to render HTML, replacing HandlebarToken objects
    // with TextToken objects using the value in Pair or the fallback in HandlebarToken
    async compile(pairs: Pair[]): Promise<string> {
        // Build quick lookup for pairs
        const pairMap = new Map(pairs.map(p => [p.key, p]));

        // Transform all tokens
        const compiledTokens = await Promise.all(
            this.tokens.map(async token => {
                if (token instanceof HandlebarToken) {
                    const pair = pairMap.get(token.key);
                    return await token.normalize(pair);
                }
                return token as TextToken;
            })
        );

        // Join all text together
        return compiledTokens.map(t => (t as TextToken).content).join("");
    }
}