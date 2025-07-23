export interface TokenSyntax {
    name: string;                               // Name of the token syntax
    regex: RegExp;                              // Regular expression to match the token syntax
    extract: (match: RegExpExecArray) => Token; // Function to extract token from regex match
}

export interface TokenMatch {
    token: Token;
    original: string;   // The original string that matched the token
    index: number;      // The index in the original string where the match starts
}

// Interface representing a token
export abstract class Token {
    name: string;                           // Name of the token
    static readonly isRequired: boolean;    // Whether the token is required

    constructor(name: string) {
        this.name = name;
    }

    abstract toString(): string;    // Method to convert the token to a string representation
}

// Class representing a required token
export class RequiredToken extends Token {
    name: string;
    static override isRequired: boolean = true;

    constructor(name: string) {
        super(name);
    }

    toString(): string {
        return `{{ ${this.name} }}`;
    }
}

// Class representing an optional token
export class OptionalToken extends Token {
    name: string;
    static override isRequired: boolean = false;

    constructor(name: string) {
        super(name);
    }

    toString(): string {
        return `{{ ${this.name}? }}`;
    }
}

// Class representing a defaulted token
export class DefaultedToken extends Token {
    name: string;
    defaultValue: string;
    static override isRequired: boolean = false;

    constructor(name: string, defaultValue: string) {
        super(name);
        this.defaultValue = defaultValue.trim();
    }

    toString(): string {
        return `{{ ${this.name} | ${this.defaultValue} }}`;
    }
}