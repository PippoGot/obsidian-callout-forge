import { ACCEPTING_STATES, ParserState, TRANSITION_MAP } from "./states";
import { CodeblockLine, LineMatch, MatchRule, Property, RuleName } from "./types";

export class CodeblockParser {
    // List of lines to parse
    private readonly _lines: string[];

    // The current state of the parser, initialized at the CodeblockStart value
    private _currentState: ParserState = ParserState.CodeblockStart;
    // Current index of the parsed line
    private _currentIndex: number = 0;
    // Current parsed line
    private _currentLineMatch: LineMatch;
    // Property buffer, should always have less than 2 items (either one or 0)
    private _currentProperty: Property | null = null;

    // Matching rules for the lines content
    private _lineMatchers = new Map<RuleName, MatchRule>([
        ["codefence-end", {
            // Match the end of a codefence if we are inside one.
            // The regex value should be null by default and updated programmatically
            // when entering a codefence, then reset to null when exiting the codefence
            name: "codefence-end",
            regex: null,
        }],
        ["property-start", {
            // Matches a key: text line,
            // spaces are arbitrary before and after colon
            // key is composed of lowercase letters and dashes
            // key name is group 1, key value is group 2
            name: "property-start",
            regex: /^([a-z\-]+)\s*:\s*(.*)$/,
        }],
        ["codefence-start", {
            // Matches 3 or more backticks, followed by text.
            // Backticks with no text are considered as normal text
            name: "codefence-start",
            regex: /^(`{3,})(?:\s*[^\s]+)?\s*$/,
        }],
        ["any-text", {
            // Catch any text, we get this match if the others fail
            name: "any-text",
            regex: /^.*$/, // catch-all fallback
        }],
    ]);

    private _stateHandlers: Record<ParserState, () => void> = {
        [ParserState.CodeblockStart]: this._handleCodeblockStart.bind(this),
        [ParserState.PropertyStart]: this._handlePropertyStart.bind(this),
        [ParserState.PropertyText]: this._handlePropertyText.bind(this),
        [ParserState.CodefenceStart]: this._handleCodefenceStart.bind(this),
        [ParserState.CodefenceText]: this._handleCodefenceText.bind(this),
        [ParserState.CodefenceEnd]: this._handleCodefenceEnd.bind(this),
        [ParserState.CodeblockEnd]: this._handleCodeblockEnd.bind(this),
        [ParserState.Error]: this._handleError.bind(this),
    };

    private _errorMessage: string | null = null;

    // The property array needed from the parsing
    private _parsedProperties: Property[] = [];
    get properties() { return this._parsedProperties; }

    constructor(source: string) {
        // Guard input type
        if (typeof source !== "string") {
            throw new TypeError("Codeblock source must be a string.");
        }

        // Trim any leading and trailing spaces
        const trimmed = source.trim();

        // If the string is empty after trimming, the codeblock has no text
        if (trimmed === "") {
            throw new Error("Codeblock is empty or has only whitespaces.")
        }

        // If the codeblock has content, it is split in lines and we start parsing
        this._lines = trimmed.split('\n');
        this._parse();
    }

    // This method implements the parsing
    private _parse(): void {
        while (this._currentState !== ParserState.CodeblockEnd && this._currentState !== ParserState.Error) {
            this._stateHandlers[this._currentState]();
        }
        if (this._currentState === ParserState.CodeblockEnd) {
            this._handleCodeblockEnd();
        } else if (this._currentState === ParserState.Error) {
            this._handleError();
        }
    }

    // Static method to get the parsed properties from a string
    static parseProperties(source: string): Property[] {
        const parser = new CodeblockParser(source);
        return parser.properties;
    }

    // Method to advance state
    private _advanceState(incrementIndex: boolean = true): void {
        // If currentIndex is the last index (no other lines to parse),
        // and the currentState is not CodeblockStart
        if (this._isLastLine(this._currentIndex) && this._currentState !== ParserState.CodeblockStart) {
            // Check if current state is accepting
            if (ACCEPTING_STATES.has(this._currentState)) {
                // If it is, next state is CodeblockEnd, no index increment
                this._currentState = ParserState.CodeblockEnd;
                return;
            }
            // If the state is not accepting, fails
            this._fail(`Unexpected end of input: expected to complete codeblock but got state ${ParserState[this._currentState]}`);
            return;
        }

        // If currentIndex is not the last index (there are still lines to parse)
        // And index is allowed to increment, increment it
        if (incrementIndex) {
            this._currentIndex++;
        }
        // Then get the matching
        this._currentLineMatch = this._matchLine(this._getLine(this._currentIndex));

        // Then perform the state transition
        const nextState = TRANSITION_MAP[this._currentState]?.[this._currentLineMatch.rule.name];
        if (nextState === undefined) {
            let msg = `Invalid transition from state ${ParserState[this._currentState]} on rule ${this._currentLineMatch.rule.name}`;
            if (this._currentState === ParserState.CodeblockStart && this._currentLineMatch.rule.name !== "property-start") {
                msg = "Codeblock must start with a property";
            }
            this._fail(msg);
            return;
        }

        this._currentState = nextState;
    }

    // --- State Handlers ---

    /**
     * Handles the CodeblockStart state.
     * This is the initial state and advances the parser to the next state
     * without consuming the current line (index not incremented).
     * The next expected state is PropertyStart.
     */
    private _handleCodeblockStart(): void {
        // Move to the appropriate state, which should be PropertyStart
        // Errors are thrown if the state we transition into is not correct
        // Index is not incremented since we need to handle the line as a PropertyStart line
        this._advanceState(false);
    }

    /**
     * Handles the PropertyStart state.
     * Stores the previous property (if any) and creates a new Property
     * from the current line match, then advances to the next state.
     */
    private _handlePropertyStart(): void {
        // Move the property in the array
        this._storeProperty();

        // Create the new property
        // The RegExpExecArray contains the property name in the first group,
        // and the value in the second group
        let newProperty = new Property(this._currentLineMatch.match[1], this._currentLineMatch.match[2]);

        // Then put it in the buffer since it may have more lines to append
        this._currentProperty = newProperty;

        // Move to next state
        this._advanceState();
    }

    /**
     * Handles the PropertyText state.
     * Appends the current line text to the existing property,
     * then advances to the next state.
     */
    private _handlePropertyText(): void {
        // Update the property with the line content
        this._updateProperty()


        // Move to next state
        this._advanceState();
    }

    /**
     * Handles the CodefenceStart state.
     * Saves the opening codefence backticks, updates the "codefence-end" regex,
     * appends the current line text to the property, and advances state.
     */
    private _handleCodefenceStart(): void {
        // Save the codefence backticks and update the MatchRule for the "codefence-end" match
        const rule = this._lineMatchers.get("codefence-end");
        if (!rule) {
            throw new Error("Implementation Error: 'codefence-end' matching rule should exist.");
        }
        rule.regex = new RegExp("^" + this._currentLineMatch.match[1] + "$");

        // Update the property with the line content
        this._updateProperty()

        // Move to next state
        this._advanceState();
    }

    /**
     * Handles the CodefenceText state.
     * Appends the current line text inside the code fence to the current property,
     * then advances to the next state.
     */
    private _handleCodefenceText(): void {
        // Update the property with the line content
        this._updateProperty()

        // Move to next state
        this._advanceState();
    }

    /**
     * Handles the CodefenceEnd state.
     * Resets the "codefence-end" matching rule regex,
     * appends the line text to the property, and advances the parser state.
     */
    private _handleCodefenceEnd(): void {
        // Reset the "codefence-end" MatchRule.regex to null
        const rule = this._lineMatchers.get("codefence-end");
        if (!rule) {
            throw new Error("Implementation Error: 'codefence-end' matching rule should exist.");
        }
        rule.regex = null;

        // Update the property with the line content
        this._updateProperty()

        // Move to next state
        this._advanceState();
    }

    /**
     * Handles the CodeblockEnd state.
     * Finalizes parsing by storing any remaining property.
     */
    private _handleCodeblockEnd(): void {
        // Move the property in the array
        this._storeProperty();
    }

    /**
     * Handles the Error state.
     * Throws an Error with the stored error message, terminating parsing.
     */
    private _handleError(): void {
        throw new Error(this._errorMessage ?? "Unknown parsing error.");
    }

    // --- Line Helpers ---

    // Method to return the requested line in the parsing array
    private _getLine(index: number): CodeblockLine {
        // If the index is not valid throw an error
        if (index >= this._lines.length || index < 0) {
            throw new Error("CodeblockLine index out of bounds.");
        }
        // Otherwise return the requested line
        return { value: this._lines[index].trim(), index }
    }

    // Method to return a LineMatch object
    private _matchLine(line: CodeblockLine): LineMatch {
        // Trim the line to remove excess spaces
        const value = line.value;

        // Iterate over all the MatchRules
        for (const rule of this._lineMatchers.values()) {
            // If the rule has no regex skip it
            if (!rule.regex) continue;

            // Exectute the regex match for the line value
            let match = rule.regex.exec(value);

            // If a match is found return it
            if (match) return { rule: rule, line: line, match: match };
        }

        // If no match was found throw an error, since at least the "any-text" rule should match
        throw new Error(`Line ${line.index + 1}: could not match line "${line.value}".`);
    }

    // Method to check if a line is the last of the lines array
    private _isLastLine(index: number): boolean {
        // If the index is negative throw an error
        if (index < 0) {
            throw new Error("Index must be a positive integer.")
        }

        return index === (this._lines.length - 1);
    }

    // --- Property Helpers ---

    // Method to move a property from the buffer to the array, when it is completed
    private _storeProperty(): void {
        if (this._currentProperty) {
            this._parsedProperties.push(this._currentProperty);
            this._currentProperty = null;
        }
    }

    // Method to update a property from the buffer with a new line
    private _updateProperty(): void {
        if (!this._currentProperty) {
            const line = this._getLine(this._currentIndex);
            throw new Error(`Line ${line.index + 1}: no current property to update for line "${line.value}".`);
        }
        this._currentProperty.appendText(this._currentLineMatch.line.value);
    }

    // --- Error Helper ---

    // Helper method to trigger error state
    private _fail(message: string): void {
        this._errorMessage = message;
        this._currentState = ParserState.Error;
    }
}