import { CalloutForgeError } from "../utils/errors";
import { Codeblock, CodeblockSource } from "../utils/types";
import { JumpCondition, LineMatch, MATCHERS } from "./match";
import { CodeblockProperty } from "./property";
import * as st from "./states";

export class CodeblockParser {
    // Quasi-static variables
    private lines: string[];
    private matchers = new Map(MATCHERS);
    private pairs: CodeblockProperty[] = [];
    get pairList(): CodeblockProperty[] { return this.pairs; }
    public errorMsg: string;

    // Dynamic variables
    private index: number = 0;
    private state: st.ParserState;
    private pair: CodeblockProperty | null = null;
    private match: LineMatch;

    // Constructor
    constructor(source: CodeblockSource) {
        // Trims the input
        const trimmedSource = source.trim();

        // Guard the source is not only whitespaces
        if (!trimmedSource) throw new CalloutForgeError("Codeblock is empty or has only whitespaces.");

        // Split lines
        this.lines = trimmedSource.split("\n");

        // Match first line and set initial state
        this.matchCurrentLine();
        this.setState(new st.CodeblockStartState(this));

        // Parse the source until a final state is reached and handled
        while (!this.state.isFinal()) { this.state.handle(); }
        this.state.handle();

        // Validate parsed properties to check for duplicates
        this.validateCodeblockPropertys();
    }

    // Methods

    // Static parse from a string
    public static fromString(source: CodeblockSource): Codeblock {
        const parser = new CodeblockParser(source);
        return parser.pairList as Codeblock;
    }

    // Set the next state of the machine
    public setState(state: st.ParserState): void {
        this.state = state;
    }

    // Push a new pair in the active pair, storing the currently active if any
    public newCodeblockProperty(pair: CodeblockProperty): void {
        this.storeCodeblockProperty();
        this.pair = pair;
    }

    // Store the currently active pair, if any
    public storeCodeblockProperty(): void {
        if (this.pair) {
            this.pairs.push(this.pair);
            this.pair = null;
        }
    }

    // Extends the currently active pair value
    public extendCodeblockPropertyValue(line: string): void {
        if (!this.pair) {
            throw new CalloutForgeError(`Line ${this.index + 1}: no active pair to append to.`);
        }
        this.pair.extend(line);
    }

    // Set the closing codefence regex
    public setCodefenceRegex(backticks: string): void {
        const rule = this.matchers.get(JumpCondition.NestedEnd);
        if (!rule) throw new CalloutForgeError("Implementation error: no codefence end matcher found.");
        rule.regex = new RegExp(`^${backticks}$`);
    }

    // Clear the closing codefence regex
    public clearCodefenceRegex(): void {
        const rule = this.matchers.get(JumpCondition.NestedEnd);
        if (!rule) throw new CalloutForgeError("Implementation error: no codefence end matcher found.");
        rule.regex = null;
    }

    // Boolean to check if we are parsing the last line
    public isLastLine(): boolean {
        return this.index >= this.lines.length - 1;
    }

    // Increment the index
    public incrementIndex(): void {
        this.index++;
    }

    // Match the current line
    public matchCurrentLine(): void {
        for (const rule of this.matchers.values()) {
            if (!rule.regex) continue; // Skip null rules
            const lineContent = this.lines[this.index];
            const matchResult = rule.regex.exec(lineContent);
            if (matchResult) {
                this.match = { rule, lineContent, lineIndex: this.index, matchResult };
                return;
            }
        }
        throw new CalloutForgeError(`Line ${this.index + 1} could not be matched.`);
    }

    // Get the current match value
    public getMatch(): LineMatch {
        return this.match;
    }

    // Validate parsed pairs to check for duplicates
    private validateCodeblockPropertys(): void {
        const seenCodeblockPropertys = new Set<string>();
        const duplicateCodeblockPropertys = new Set<string>();

        for (const pair of this.pairs) {
            seenCodeblockPropertys.has(pair.key) ? duplicateCodeblockPropertys.add(pair.key) : seenCodeblockPropertys.add(pair.key);
        }
        if (duplicateCodeblockPropertys.size > 0) {
            throw new CalloutForgeError(`Duplicate pairs found: ${[...duplicateCodeblockPropertys].join(", ")}`)
        }
    }
}