// Class to represent the parsed properties (key: value)
export class Property {
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