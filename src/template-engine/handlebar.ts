import { FallbackToken, HandlebarToken, OptionalToken, RequiredToken } from "./token";

export type HandlebarSyntaxName = "required" | "optional" | "fallback";

export interface HandlebarSyntax {
    syntaxName: HandlebarSyntaxName;
    regex: RegExp;
    toToken(match: RegExpExecArray): HandlebarToken;
}

export type HandlebarSyntaxLibrary = Map<HandlebarSyntaxName, HandlebarSyntax>;

export const SYNTAX_LIBRARY: HandlebarSyntaxLibrary = new Map([
    ["required", {
        syntaxName: "required",
        regex: /\{\{\s*([a-zA-Z\-]+)\s*\}\}/,
        toToken(match: RegExpExecArray) {
            const key = match[1].trim();
            return new RequiredToken(key);
        }
    }],
    ["optional", {
        syntaxName: "optional",
        regex: /\{\{\s*([a-zA-Z\-]+)\s*\?\s*\}\}/,
        toToken(match: RegExpExecArray) {
            const key = match[1].trim();
            return new OptionalToken(key);
        }
    }],
    ["fallback", {
        syntaxName: "fallback",
        regex: /\{\{\s*([a-zA-Z\-]+)\s*\|\s*([^\}]+)\s*\}\}/,
        toToken(match: RegExpExecArray) {
            const key = match[1].trim();
            const fallback = match[2].trim();
            return new FallbackToken(key, fallback);
        }
    }],
]);