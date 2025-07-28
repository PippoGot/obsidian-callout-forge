/**
 * Splits a string into [head, tail] at the specified occurrence of a delimiter.
 * The delimiter is a string, and the split excludes the delimiter itself.
 *
 * @param sourceString - The input string to split.
 * @param delimiter - The delimiter string to split on.
 * @param occurrence - Which occurrence of the delimiter to split at:
 *   - "first" (default) or 1: split at the first occurrence
 *   - "last" or -1: split at the last occurrence
 *   - number > 0: split at the Nth occurrence
 *
 * @returns A tuple [head, tail] where:
 *   - head contains the substring before the specified delimiter occurrence
 *   - tail contains the substring after the specified delimiter occurrence
 *
 * @throws Error if:
 *   - occurrence is 0 (not allowed)
 *   - occurrence is greater than available delimiter occurrences
 */
export function stringBisect(sourceString: string, delimiter: string, occurrence: number | "first" | "last" = "first"): string[] {
    // Zero-length delimiter is not accepted
    if (delimiter.length === 0) {
        throw new Error(`Delimiter cannot be an empty string.`);
    }

    // Occurrence value 0 has no meanining
    if (occurrence === 0) {
        throw new Error(`Occurrence "0" is not allowed. Use a non-zero number, "first" or "last".`);
    }

    // Normalize 'first' and 'last' to numbers
    occurrence === "first" ? occurrence = 1 : null;
    occurrence === "last" ? occurrence = -1 : null;

    // Split the string by the delimiter into parts
    const splits = sourceString.split(delimiter);

    // Adjust negative occurrence to positive index from the end
    occurrence < 0 ? occurrence = splits.length + occurrence : null;

    // Check if occurrence is within bounds (must have that many delimiters)
    if (occurrence > splits.length - 1) {
        throw new Error(`Occurrence index out of bounds.`);
    }

    // Join the parts before the delimiter occurrence for head
    const head = splits.slice(0, occurrence).join(delimiter);
    // Join the parts after the delimiter occurrence for tail
    const tail = splits.slice(occurrence).join(delimiter);

    return [head, tail];
}
