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
}

enum ParserState {
    CodeblockStart,
    PropertyStart,
    PropertyText,
    CodefenceStart,
    CodefenceText,
    CodefenceEnd,
    CodeblockEnd,
    Error,
}

type RuleName = "property-start" | "codefence-start" | "codefence-end" | "any-text";

interface MatchRule {
    name: RuleName;
    regex: RegExp | null;
}

interface CodeblockLine {
    value: string;
    index: number;
}

interface LineMatch {
    rule: MatchRule;
    line: CodeblockLine;
    match: RegExpExecArray;
}

export class CodeblockParser {
    // List of lines to parse
    private _lines: string[];

    // The current state of the parser, initialized at the CodeblockStart value
    private _currentState: ParserState = ParserState.CodeblockStart;
    // Current index of the parsed line
    private _currentIndex: number = 0;
    // Current parsed line
    private _currentMatch: LineMatch;
    // Property buffer, should always have less than 2 items (either one or 0)
    private _currentProperty: Property | null = null;

    // Matching rules for the lines content
    private _matchRules = new Map<RuleName, MatchRule>([
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
            regex: /^(`{3,})\s*$/,
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
    private _properties: Property[] = [];
    get properties() { return this._properties; }

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

    // Method to return the requested line in the parsing array
    private _getLine(index: number): CodeblockLine {
        // If the index is not valid throw an error
        if (index > this._lines.length || index < 0) {
            throw new Error("CodeblockLine index out of bounds.");
        }
        // Otherwise return the requested line
        return { value: this._lines[index].trim(), index }
    }

    // Method to check if a line is the last of the lines array
    private _isLastLine(index: number): boolean {
        // If the index is negative throw an error
        if (index < 0) {
            throw new Error("Index must be a positive integer.")
        }

        return index === (this._lines.length - 1);
    }

    // Method to return a LineMatch object
    private _matchLine(line: CodeblockLine): LineMatch {
        // Trim the line to remove excess spaces
        const value = line.value;

        // Iterate over all the MatchRules
        for (const rule of this._matchRules.values()) {
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

    // Method to move forward the parser
    private _advanceToNextLine(): boolean {
        // If currentIndex is the last index move to CodeblockEnd state without incrementing the state
        if (this._isLastLine(this._currentIndex)) {
            this._currentState = ParserState.CodeblockEnd;
            return false;
        }

        // Otherwise increment the index and get the next matching
        this._currentIndex++;
        this._currentMatch = this._matchLine(this._getLine(this._currentIndex));
        return true;
    }

    // This method implements the parsing
    private _parse(): void {
        while (this._currentIndex < this._lines.length) {
            this._stateHandlers[this._currentState]();
        }
    }

    // Method to move a property from the buffer to the array, when it is completed
    private _storeProperty(): void {
        if (this._currentProperty) {
            this._properties.push(this._currentProperty);
            this._currentProperty = null;
        }
    }

    // Method to update a property from the buffer with a new line
    private _updateProperty(): void {
        if (!this._currentProperty) {
            const line = this._getLine(this._currentIndex);
            throw new Error(`Line ${line.index + 1}: no current property to update for line "${line.value}".`);
        }
        this._currentProperty.appendText(this._currentMatch.line.value);
    }

    // Method to handle the CodeblockStart state
    private _handleCodeblockStart(): void {
        // Get the first line match
        this._currentMatch = this._matchLine(this._getLine(this._currentIndex));

        // If the line doesn't match with a "property-start" rule throw an error
        if (this._currentMatch.rule.name !== "property-start") {
            const line = this._getLine(this._currentIndex);
            throw new Error(`Line ${line.index + 1}: codeblock must start with a property (e.g. 'property-name: value').`);
        }

        // If no error is thrown we have a "property-start" match
        // Set the next state to a PropertyStart state
        this._currentState = ParserState.PropertyStart;

        // Index is not incremented since we need to handle the line as a PropertyStart line
    }

    // Method to handle the PropertyStart state
    private _handlePropertyStart(): void {
        // Move the property in the array
        this._storeProperty();

        // Create the new property
        // The RegExpExecArray contains the property name in the first group,
        // and the value in the second group
        let newProperty = new Property(this._currentMatch.match[1], this._currentMatch.match[2]);

        // Then put it in the buffer since it may have more lines to append
        this._currentProperty = newProperty;

        // Move to next line
        if (!this._advanceToNextLine()) return;

        // Finally update the state based on matching and current state
        switch (this._currentMatch.rule.name) {
            case "property-start":
                // Should remain in PropertyStart state, a new property begins
                this._currentState = ParserState.PropertyStart;
                break;
            case "codefence-start":
                // Should move to CodefenceStart state, a codefence is found
                this._currentState = ParserState.CodefenceStart;
                // Code for the management of the fence should be in the appropriate handle method
                break;
            case "any-text":
                // Should move to PropertyText state, more text for this property is found
                this._currentState = ParserState.PropertyText;
                break;
        }
    }

    // Method to handle the PropertyText state
    private _handlePropertyText(): void {
        // Update the property with the line content
        this._updateProperty()

        // Move to next line
        if (!this._advanceToNextLine()) return;

        // Finally update the state based on matching and current state
        switch (this._currentMatch.rule.name) {
            case "property-start":
                // Should move to PropertyStart state, a new property begins
                this._currentState = ParserState.PropertyStart;
                break;
            case "codefence-start":
                // Should move to CodefenceStart state, a codefence is found
                this._currentState = ParserState.CodefenceStart;
                // Code for the management of the fence should be in the appropriate handle method
                break;
            case "any-text":
                // Should remain in PropertyText state, more text for this property is found
                this._currentState = ParserState.PropertyText;
                break;
        }
    }

    // Method to handle the CodefenceStart state
    private _handleCodefenceStart(): void {
        // Save the codefence backticks and update the MatchRule for the "codefence-end" match
        const rule = this._matchRules.get("codefence-end");
        if (!rule) {
            throw new Error("Implementation Error: 'codefence-end' matching rule should exist.");
        }
        rule.regex = new RegExp("^" + this._currentMatch.match[1] + "$");

        // Update the property with the line content
        this._updateProperty()

        // If currentIndex is the last index move to CodeblockEnd state without incrementing the state
        if (this._isLastLine(this._currentIndex)) {
            const line = this._getLine(this._currentIndex);
            this._fail(`Line ${line.index + 1}: codeblock ends immediately after opening codefence.`);
            return;
        }

        // Otherwise increment the index and get the next matching
        this._currentIndex++;
        this._currentMatch = this._matchLine(this._getLine(this._currentIndex));

        // Finally update the state based on matching and current state
        switch (this._currentMatch.rule.name) {
            case "codefence-end":
                // Should move to CodefenceEnd, the codefence is finished
                this._currentState = ParserState.CodefenceEnd;
                break;
            case "property-start":
            case "codefence-start":
            case "any-text":
                // Should move to CodefenceText state,
                // the text inside codefence is part of the property regardless of the matching
                this._currentState = ParserState.CodefenceText;
                break;
        }
    }

    // Method to handle the CodefenceText state
    private _handleCodefenceText(): void {
        // Update the property with the line content
        this._updateProperty()

        // If currentIndex is the last index move to CodeblockEnd state without incrementing the state
        if (this._isLastLine(this._currentIndex)) {
            const line = this._getLine(this._currentIndex);
            this._fail(`Line ${line.index + 1}: expected closing codefence before end of input.`);
            return;
        }

        // Otherwise increment the index and get the next matching
        this._currentIndex++;
        this._currentMatch = this._matchLine(this._getLine(this._currentIndex));

        // Finally update the state based on matching and current state
        switch (this._currentMatch.rule.name) {
            case "codefence-end":
                // Should move to CodefenceEnd, the codefence is finished
                this._currentState = ParserState.CodefenceEnd;
                break;
            case "property-start":
            case "codefence-start":
            case "any-text":
                // Should move to CodefenceText state,
                // the text inside codefence is part of the property regardless of the matching
                this._currentState = ParserState.CodefenceText;
                break;
        }
    }

    // Method to handle the CodefenceEnd state
    private _handleCodefenceEnd(): void {
        // Reset the "codefence-end" MatchRule.regex to null
        const rule = this._matchRules.get("codefence-end");
        if (!rule) {
            throw new Error("Implementation Error: 'codefence-end' matching rule should exist.");
        }
        rule.regex = null;

        // Update the property with the line content
        this._updateProperty()

        // Move to next line
        if (!this._advanceToNextLine()) return;

        // Finally update the state based on matching and current state
        switch (this._currentMatch.rule.name) {
            case "property-start":
                // Should move to PropertyStart state, a new property begins
                this._currentState = ParserState.PropertyStart;
                break;
            case "codefence-start":
                // Should move to CodefenceStart state, a codefence is found
                this._currentState = ParserState.CodefenceStart;
                // Code for the management of the fence should be in the appropriate handle method
                break;
            case "any-text":
                // Should remain in PropertyText state, more text for this property is found
                this._currentState = ParserState.PropertyText;
                break;
        }
    }

    // Method to handle the CodeblockEnd state
    private _handleCodeblockEnd(): void {
        // Move the property in the array
        this._storeProperty();

        // All the properties have now been extracted
        // Increment the index to exit from the main while loop
        this._currentIndex++;
    }

    // Method to handle the Error state
    private _handleError(): void {
        throw new Error(this._errorMessage ?? "Unknown parsing error.");
    }

    // Helper method to trigger error state
    private _fail(message: string): void {
        this._errorMessage = message;
        this._currentState = ParserState.Error;
    }
}