import * as StringOps from "../utils/string-operations";

describe("StringOps.stringBisect", () => {
    // Test basic string delimiter splitting
    test("splits at first occurrence of string delimiter", () => {
        const [head, tail] = StringOps.stringBisect("a::b::c", "::");
        expect(head).toBe("a");
        expect(tail).toBe("b::c");
    });

    // Test splitting using a regular expression as delimiter
    test("splits at first match of RegExp delimiter", () => {
        const [head, tail] = StringOps.stringBisect("x123y456", /\d+/);
        expect(head).toBe("x");
        expect(tail).toBe("y456");
    });

    // Test when the delimiter is found at the beginning of the string
    test("works when delimiter is at the beginning", () => {
        const [head, tail] = StringOps.stringBisect("::abc", "::");
        expect(head).toBe("");
        expect(tail).toBe("abc");
    });

    // Test when the delimiter is found at the end of the string
    test("works when delimiter is at the end", () => {
        const [head, tail] = StringOps.stringBisect("abc::", "::");
        expect(head).toBe("abc");
        expect(tail).toBe("");
    });

    // Test that an error is thrown when the delimiter is not found (string case)
    test("throws error when delimiter is not found (string)", () => {
        const delimiter = "::";
        expect(() => {
            StringOps.stringBisect("no-delimiter-here", delimiter);
        }).toThrow(`Delimiter "${delimiter.toString()}" not found in source string.`);
    });

    // Test that an error is thrown when the delimiter is not found (regex case)
    test("throws error when delimiter is not found (RegExp)", () => {
        const delimiter = /\d+/;
        expect(() => {
            StringOps.stringBisect("abc def", delimiter);
        }).toThrow(`Delimiter "${delimiter.toString()}" not found in source string.`);
    });

    // Test that special characters in string delimiters are handled correctly
    test("handles delimiters with special regex characters", () => {
        const [head, tail] = StringOps.stringBisect("a.*+?^b.*+?^c", ".*+?^");
        expect(head).toBe("a");
        expect(tail).toBe("b.*+?^c");
    });

    // Edge case: empty source string with delimiter present
    test("throws error when splitting empty string", () => {
        const delimiter = "::";
        expect(() => {
            StringOps.stringBisect("", delimiter);
        }).toThrow(`Delimiter "${delimiter.toString()}" not found in source string.`);
    });

    // Edge case: delimiter is empty string (should throw or handle gracefully)
    test("throws error when delimiter is empty string", () => {
        const delimiter = "";
        expect(() => {
            StringOps.stringBisect("abc", delimiter);
        }).toThrow(`Delimiter "${delimiter.toString()}" not found in source string.`);
    });

    // Edge case: delimiter regex that matches empty string (should throw)
    test("throws error when delimiter regex matches empty string", () => {
        const delimiter = /^/; // matches start of string, zero-length match
        expect(() => {
            StringOps.stringBisect("abc", delimiter);
        }).toThrow(`Delimiter "${delimiter.toString()}" not found in source string.`);
    });

    // Edge case: multiple delimiters, only first occurrence used
    test("splits only at first occurrence of multiple delimiters", () => {
        const [head, tail] = StringOps.stringBisect("first##second##third", "##");
        expect(head).toBe("first");
        expect(tail).toBe("second##third");
    });

    // Edge case: delimiter is a regex with multiple matches, split at first
    test("splits at first regex match when multiple matches exist", () => {
        const [head, tail] = StringOps.stringBisect("a1b2c3d", /\d/);
        expect(head).toBe("a");
        expect(tail).toBe("b2c3d");
    });
});
