import { CodeblockParser } from "./parser";
import { ParserState } from "./states";

export enum JumpCondition {
    Property,
    NestedStart,
    NestedEnd,
    Text,
}

export type JumpMap = Partial<Record<JumpCondition, new (context: CodeblockParser) => ParserState>>;

export class LineMatchRule {
    constructor(public readonly jumpTo: JumpCondition, public regex: RegExp | null) { }
}

export const MATCHERS = new Map<JumpCondition, LineMatchRule>([
    [JumpCondition.NestedEnd, new LineMatchRule(JumpCondition.NestedEnd, null)],
    [JumpCondition.Property, new LineMatchRule(JumpCondition.Property, /^([a-z\-]+)\s*:\s*(.*)$/)],
    [JumpCondition.NestedStart, new LineMatchRule(JumpCondition.NestedStart, /^(`{3,})(?:\s*[^\s]+)?\s*$/)],
    [JumpCondition.Text, new LineMatchRule(JumpCondition.Text, /^.*$/)],
])

export interface LineMatch {
    rule: LineMatchRule;
    lineContent: string;
    lineIndex: number;
    matchResult: RegExpExecArray;
}
