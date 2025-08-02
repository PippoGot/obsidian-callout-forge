import { CalloutForgeError } from "../utils/errors";
import { JumpCondition, JumpMap } from "./match";
import { Pair } from "./pair";
import { CodeblockParser } from "./parser";

export const enum StateType {
    Initial,    // An initial state is the first state the system is initialized to
    Accepting,  // An accepting state can move to a Final state
    Final,      // A final state has no other transitions and will stop the loop
    Normal,     // A normal state is neither of the above
}

export abstract class ParserState {
    // Map of states to jump based on the condition
    protected jumpMap?: JumpMap;
    // The type of the state, default to normal
    protected stateType: StateType = StateType.Normal;

    constructor(protected parent: CodeblockParser) { }

    public abstract handle(): void;

    protected jump(): void {
        // If last line
        if (this.parent.isLastLine()) {
            // And state is accepting
            if (this.stateType === StateType.Accepting) {
                // Move to the final state
                this.parent.setState(new CodeblockEndState(this.parent));
                return;
            }
            // Otherwise should throw an error
            this.parent.errorMsg = `Unexpected end of input: ${this.toString()} is not an accepting state.`;
            this.parent.setState(new ParsingErrorState(this.parent));
            return
        }

        // Otherwise increment and get next match
        this.parent.incrementIndex();
        this.parent.matchCurrentLine();
        const nextMatch = this.parent.getMatch();

        // Then get next state from the jump map
        const nextState = this.jumpMap?.[nextMatch.rule.jumpTo];
        if (nextState) {
            this.parent.setState(new nextState(this.parent))
            return;
        }

        // If there is no mapping, should throw an error
        this.parent.errorMsg = `Invalid input transition: ${JumpCondition[nextMatch.rule.jumpTo]} jump condition has no mapping in ${this.toString()}.`;
        this.parent.setState(new ParsingErrorState(this.parent));
    }

    public toString(): string { return this.constructor.name; }
    public isFinal(): boolean { return this.stateType === StateType.Final; }
}

/**
 * Handles the CodeblockStart state.
 * This is the initial state and advances the parser to the next state
 * without consuming the current line (index not incremented).
 * Only Pair is accepted as next state.
 */
export class CodeblockStartState extends ParserState {
    protected stateType = StateType.Initial;

    public handle(): void {
        this.jump();
    }

    protected override jump(): void {
        const match = this.parent.getMatch();
        const nextState = this.jumpMap?.[match.rule.jumpTo];
        if (nextState) {
            this.parent.setState(new nextState(this.parent))
            return;
        }
        this.parent.errorMsg = "Codeblock must start with a pair.";
        this.parent.setState(new ParsingErrorState(this.parent));
    }

    protected override jumpMap: JumpMap = {
        [JumpCondition.Pair]: PairState,
    };
}

/**
 * Handles the Pair state.
 * Stores the previous pair (if any) and creates a new Pair
 * from the current line match, then advances to the next state.
 */
export class PairState extends ParserState {
    protected stateType = StateType.Accepting;

    public handle(): void {
        // Handle current line
        const match = this.parent.getMatch();
        const pair = new Pair(match.matchResult[1], match.matchResult[2]);
        this.parent.newPair(pair);

        // Jump to next state
        this.jump();
    }

    protected override jumpMap: JumpMap = {
        [JumpCondition.Pair]: PairState,
        [JumpCondition.NestedStart]: NestedStartState,
        [JumpCondition.Text]: PairContentState,
    };
}

/**
 * Handles the PropertyContent state.
 * Appends the current line text to the existing pair,
 * then advances to the next state.
 */
export class PairContentState extends ParserState {
    protected stateType = StateType.Accepting;

    public handle(): void {
        // Handle current line
        const match = this.parent.getMatch();
        this.parent.extendPairValue(match.lineContent);

        // Jump to next state
        this.jump();
    }

    protected override jumpMap: JumpMap = {
        [JumpCondition.Pair]: PairState,
        [JumpCondition.NestedStart]: NestedStartState,
        [JumpCondition.Text]: PairContentState,
    };
}

/**
 * Handles the NestedStart state.
 * Saves the opening codefence backticks, updates the NestedEnd MatchRule,
 * appends the current line text to the active pair, and advances state.
 */
export class NestedStartState extends ParserState {
    public handle(): void {
        // Handle current line
        const match = this.parent.getMatch();
        this.parent.setCodefenceRegex(match.matchResult[1]);
        this.parent.extendPairValue(match.lineContent);

        // Jump to next state
        this.jump();
    }

    protected override jumpMap: JumpMap = {
        [JumpCondition.NestedEnd]: NestedEndState,
        [JumpCondition.Pair]: NestedContentState,
        [JumpCondition.NestedStart]: NestedContentState,
        [JumpCondition.Text]: NestedContentState,
    };
}

/**
 * Handles the NestedContent state.
 * Appends the current line text inside the code fence to the active pair,
 * then advances to the next state.
 */
export class NestedContentState extends ParserState {
    public handle(): void {
        // Handle current line
        const match = this.parent.getMatch();
        this.parent.extendPairValue(match.lineContent);

        // Jump to next state
        this.jump();
    }

    protected override jumpMap: JumpMap = {
        [JumpCondition.NestedEnd]: NestedEndState,
        [JumpCondition.Pair]: NestedContentState,
        [JumpCondition.NestedStart]: NestedContentState,
        [JumpCondition.Text]: NestedContentState,
    };
}

/**
 * Handles the NestedEnd state.
 * Resets the NestedEnd MatchRule, appends the line text to the active pair,
 * and advances the parser state.
 */
export class NestedEndState extends ParserState {
    protected stateType = StateType.Accepting;

    public handle(): void {
        // Handle current line
        const match = this.parent.getMatch();
        this.parent.clearCodefenceRegex();
        this.parent.extendPairValue(match.lineContent);

        // Jump to next state
        this.jump();
    }

    protected override jumpMap: JumpMap = {
        [JumpCondition.Pair]: PairState,
        [JumpCondition.NestedStart]: NestedStartState,
        [JumpCondition.Text]: PairContentState,
    };
}

/**
 * Handles the CodeblockEnd state.
 * Finalizes parsing by storing any remaining pair.
 */
export class CodeblockEndState extends ParserState {
    protected stateType = StateType.Final;

    public handle(): void {
        // Handle current line
        this.parent.storePair();

        // No jump, this is a closing state
    }
}

/**
 * Handles the ParsingError state.
 * Throws an Error with the stored error message, terminating parsing.
 */
export class ParsingErrorState extends ParserState {
    protected stateType = StateType.Final;

    public handle(): void {
        // Handle error
        const msg = this.parent.errorMsg;
        throw new CalloutForgeError(msg);
    }
}