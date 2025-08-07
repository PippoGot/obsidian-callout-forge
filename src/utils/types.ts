import { CodeblockProperty } from "codeblock-engine/property";
import { Token } from "template-engine/token";

export type SourceTemplate = string;
export type CompiledTemplate = string;
export type TokenizedTemplate = Token[];

export type CodeblockSource = string;
export type Codeblock = CodeblockProperty[];