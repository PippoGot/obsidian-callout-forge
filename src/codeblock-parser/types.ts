import { CalloutForgeError } from "errors";
import { Token } from "template/token";

// Class to represent the parsed properties (key: value)
export class CodeblockProperty {
    // Name of the property
    readonly name: string;

    // Value of the property
    private _value: string;
    get value() { return this._value; }

    constructor(name: string, value: string) {
        this.name = name;
        this._value = value;
    }

    // This method adds a line to the property value
    public appendText(value: string): void {
        this._value += `\n${value}`;
    }

    // Method to print the object
    public toString(): string {
        return `${this.name}: ${this._value}`;
    }
}

// TODO: move where it belongs, but where does it belong ?
export function normalizeCodeblockProperties(properties: CodeblockProperty[], tokens: Token[]): CodeblockProperty[] {
    const normalized: CodeblockProperty[] = [];
    const missingRequiredTokens: string[] = [];

    // Build a map for fast lookup
    const propMap = new Map<string, CodeblockProperty>();
    for (const prop of properties) {
        propMap.set(prop.name.trim(), prop);
    }

    for (const token of tokens) {
        const name = token.name.trim();
        const prop = propMap.get(name);

        if (prop) {
            normalized.push(prop); // Keep valid property
        } else {
            const tokenConstructor = token.constructor as typeof Token;

            if (tokenConstructor.isRequired) {
                missingRequiredTokens.push(name); // Collect missing required
            } else {
                // Optional token
                const defaultValue = (token as any).defaultValue;
                normalized.push(new CodeblockProperty(name, defaultValue));
            }
        }
    }

    // Report missing required tokens
    if (missingRequiredTokens.length > 0) {
        throw new CalloutForgeError(`Missing required properties: ${missingRequiredTokens.join(", ")}`);
    }

    return normalized;
}

// Type to improve typing of MatchRule
export type RuleName = "property-start" | "codefence-start" | "codefence-end" | "any-text";

// Type to define a matchging rule for the parser
export interface MatchRule {
    name: RuleName;
    regex: RegExp | null;
}

// Type to define a line for the parser
export interface CodeblockLine {
    value: string;
    index: number;
}

// Type to define a full line match for the parser
export interface LineMatch {
    rule: MatchRule;
    line: CodeblockLine;
    match: RegExpExecArray;
}