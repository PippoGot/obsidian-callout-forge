import { Pair } from "codeblock-engine/pair";
import { Token } from "template-engine/token";

export type SourceTemplate = string;
export type CompiledTemplate = string;
export type TokenizedTemplate = Token[];

export type Codeblock = Pair[];