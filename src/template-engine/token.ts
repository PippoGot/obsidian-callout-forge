import { Pair } from "../codeblock-engine/property";
import { CalloutForgeError } from "../utils/errors";

export type TokenType = "text" | "handlebar";

export interface Token {
    type: TokenType;
}

abstract class AbstractToken implements Token {
    constructor(public readonly type: TokenType) { }
}

export class TextToken extends AbstractToken {
    constructor(public readonly content: string) { super("text"); }
}

export class HandlebarToken extends AbstractToken {
    readonly fallback: string | undefined = undefined;

    constructor(public readonly key: string) { super("handlebar"); }

    // Return the corresponding TextToken given a Pair object
    normalize(pair?: Pair): TextToken {
        // Pair is given, use Pair value
        if (pair) {
            return new TextToken(pair.wrap());
        }

        // Pair is not given and HandlebarToken has a fallback, use fallpack value
        if (this.fallback !== undefined) {
            return new TextToken(this.fallback);
        }

        // Pair is not given and fallback is undefined, throw error
        throw new CalloutForgeError(`Missing value for required key "${this.key}"`);
    }
}

export class RequiredToken extends HandlebarToken {
    override readonly fallback = undefined;
    constructor(key: string) { super(key); }
}

export class OptionalToken extends HandlebarToken {
    override readonly fallback = "";
    constructor(key: string) { super(key); }
}

export class FallbackToken extends HandlebarToken {
    constructor(key: string, readonly fallback: string) { super(key); }
}