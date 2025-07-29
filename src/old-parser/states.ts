import { RuleName } from "./types";

export enum ParserState {
    CodeblockStart,
    PropertyStart,
    PropertyText,
    CodefenceStart,
    CodefenceText,
    CodefenceEnd,
    CodeblockEnd,
    Error,
}

export const ACCEPTING_STATES = new Set<ParserState>([
    ParserState.PropertyStart,
    ParserState.PropertyText,
    ParserState.CodefenceEnd,
]);

export const TRANSITION_MAP: Record<ParserState, Partial<Record<RuleName, ParserState>>> = {
    [ParserState.CodeblockStart]: {
        "property-start": ParserState.PropertyStart,
    },
    [ParserState.PropertyStart]: {
        "property-start": ParserState.PropertyStart,
        "codefence-start": ParserState.CodefenceStart,
        "any-text": ParserState.PropertyText,
    },
    [ParserState.PropertyText]: {
        "property-start": ParserState.PropertyStart,
        "codefence-start": ParserState.CodefenceStart,
        "any-text": ParserState.PropertyText,
    },
    [ParserState.CodefenceStart]: {
        "codefence-end": ParserState.CodefenceEnd,
        "property-start": ParserState.CodefenceText,
        "codefence-start": ParserState.CodefenceText,
        "any-text": ParserState.CodefenceText,
    },
    [ParserState.CodefenceText]: {
        "codefence-end": ParserState.CodefenceEnd,
        "property-start": ParserState.CodefenceText,
        "codefence-start": ParserState.CodefenceText,
        "any-text": ParserState.CodefenceText,
    },
    [ParserState.CodefenceEnd]: {
        "property-start": ParserState.PropertyStart,
        "codefence-start": ParserState.CodefenceStart,
        "any-text": ParserState.PropertyText,
    },
    [ParserState.CodeblockEnd]: {},
    [ParserState.Error]: {},
};
