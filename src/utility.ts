// Split a string on the first occurrence of a regex pattern
export function splitOnFirstMatch(input: string, regex: RegExp): [string, string] {
    // Use regex to find the first match and its index
    // If no match is found, return the original string and an empty string
    const match = input.match(regex);
    const index = input.search(regex);

    if (match && index >= 0) {
        const before = input.slice(0, index);
        const after = input.slice(index + match[0].length);
        return [before, after];
    }

    return [input, ""];
}