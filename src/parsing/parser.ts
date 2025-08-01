import { Pair } from "../rendering/pair";
import { ObsidianRenderingContext } from "../rendering/types";
import { CalloutForgeError } from "../utils/errors";
import { JumpCondition, LineMatch, MATCHERS } from "./match";
import * as st from "./states";

export class CodeblockParser {
    // Quasi-static variables
    private lines: string[];
    private matchers = new Map(MATCHERS);
    private pairs: Pair[] = [];
    get pairList(): Pair[] { return this.pairs; }
    public errorMsg: string;

    // Dynamic variables
    private index: number = 0;
    private state: st.ParserState;
    private pair: Pair | null = null;
    private match: LineMatch;

    // Constructor
    constructor(source: string, readonly context: ObsidianRenderingContext) {
        // Guard source type is a string
        if (typeof source !== "string") throw new CalloutForgeError("Source must be a string to parse.");

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
        this.validatePairs();
    }

    // Methods

    // Static parse from a string
    public static fromString(source: string, context: ObsidianRenderingContext): Pair[] {
        const parser = new CodeblockParser(source, context);
        return parser.pairList;
    }

    // Set the next state of the machine
    public setState(state: st.ParserState): void {
        this.state = state;
    }

    // Push a new pair in the active pair, storing the currently active if any
    public newPair(pair: Pair): void {
        this.storePair();
        this.pair = pair;
    }

    // Store the currently active pair, if any
    public storePair(): void {
        if (this.pair) {
            this.pairs.push(this.pair);
            this.pair = null;
        }
    }

    // Extends the currently active pair value
    public extendPairValue(line: string): void {
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
    private validatePairs(): void {
        const seenPairs = new Set<string>();
        const duplicatePairs = new Set<string>();

        for (const pair of this.pairs) {
            seenPairs.has(pair.key) ? duplicatePairs.add(pair.key) : seenPairs.add(pair.key);
        }
        if (duplicatePairs.size > 0) {
            throw new CalloutForgeError(`Duplicate pairs found: ${[...duplicatePairs].join(", ")}`)
        }
    }
}