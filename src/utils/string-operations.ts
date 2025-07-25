/**
 * Splits a string into [head, tail] at the first occurrence of a delimiter.
 * The delimiter can be a string or a RegExp.
 * If the delimiter is not found, an error is thrown.
 *
 * @param sourceString - The string to split.
 * @param delimiter - The delimiter to split on (string or RegExp).
 * @returns A tuple [head, tail] split at the first occurrence of the delimiter,
 * excluding the delimiter itself from both parts.
 * @throws Error if the delimiter is not found in the string.
 */
// MAYBE: option to include the delimiter to one of the parts or as array element
export function stringBisect(sourceString: string, delimiter: string | RegExp): string[] {
    // If delimiter is a string, convert it to a RegExp (escaped) to match the first occurrence
    const regex = typeof delimiter === "string" ? new RegExp(escapeRegExp(delimiter)) : delimiter;

    // Execute the regex to find the first match in the source string
    const match = regex.exec(sourceString);
    // If no match is found or the match is zero-length, throw an error
    if (!match || match.index === undefined || match[0].length === 0) {
        throw new Error(`Delimiter "${delimiter.toString()}" not found in source string.`);
    }

    // Slice the string into two parts: before and after the delimiter match
    const head = sourceString.slice(0, match.index);
    const tail = sourceString.slice(match.index + match[0].length);
    return [head, tail];
}

/**
 * Escapes special characters in a string so it can be safely used in a RegExp.
 *
 * @param str - The string to escape.
 * @returns The escaped string.
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}