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
    readonly name: string;                  // Name of the token
    static readonly isRequired: boolean;    // Whether the token is required

    constructor(name: string) {
        this.name = name.trim();
    }

    // Method to convert the token to a string representation
    abstract toString(): string;

    // Method to ceck if this token and another token are instances of the same subclass
    isSameSubclass(other: Token): boolean {
        return this.constructor === other.constructor;
    }

    // Method to check if this token is equal to another token
    isEquivalentTo(other: Token): boolean {
        // First, check if the subclasses are the same
        if (!this.isSameSubclass(other)) {
            return false; // Different subclasses cannot be equivalent
        }

        // Then, check if the names are the same
        return this.name === other.name;
    }
}

// Class representing a required token
export class RequiredToken extends Token {
    static override readonly isRequired: boolean = true;

    constructor(name: string) {
        super(name);
    }

    toString(): string {
        return `{{ ${this.name} }}`;
    }
}

// Class representing an optional token
export class OptionalToken extends Token {
    readonly defaultValue: string = "";
    static override readonly isRequired: boolean = false;

    constructor(name: string) {
        super(name);
    }

    toString(): string {
        return `{{ ${this.name}? }}`;
    }
}

// Class representing a defaulted token
export class DefaultedToken extends Token {
    readonly defaultValue: string;
    static override readonly isRequired: boolean = false;

    constructor(name: string, defaultValue: string) {
        super(name);
        this.defaultValue = defaultValue.trim();
    }

    toString(): string {
        return `{{ ${this.name} | ${this.defaultValue} }}`;
    }

    // Override isEquivalentTo to also check defaultValue
    override isEquivalentTo(other: Token): boolean {
        // First check the superclass equivalence
        if (!super.isEquivalentTo(other)) return false;

        // Then check the other properties specific to DefaultedToken
        if (!(other instanceof DefaultedToken)) return false;
        return this.defaultValue === other.defaultValue;
    }
}