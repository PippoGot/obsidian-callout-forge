import { stringBisect } from "../utils/string-operations";

describe("stringBisect", () => {
    // Basic splitting at first occurrence
    test("splits at first occurrence of a string delimiter", () => {
        const [head, tail] = stringBisect("a::b::c", "::", "first");
        expect(head).toBe("a");
        expect(tail).toBe("b::c");
    });

    // Splitting at a specific occurrence (numeric)
    test("splits at 2nd occurrence of delimiter", () => {
        const [head, tail] = stringBisect("a::b::c", "::", 2);
        expect(head).toBe("a::b");
        expect(tail).toBe("c");
    });

    // Splitting at last occurrence
    test("splits at last occurrence of delimiter", () => {
        const [head, tail] = stringBisect("first##second##third", "##", "last");
        expect(head).toBe("first##second");
        expect(tail).toBe("third");
    });

    // Splitting when delimiter is at the beginning
    test("splits when delimiter is at the beginning", () => {
        const [head, tail] = stringBisect("::abc", "::", "first");
        expect(head).toBe("");
        expect(tail).toBe("abc");
    });

    // Splitting when delimiter is at the end
    test("splits when delimiter is at the end", () => {
        const [head, tail] = stringBisect("abc::", "::", "first");
        expect(head).toBe("abc");
        expect(tail).toBe("");
    });

    // Throws when delimiter not found
    test("throws error when delimiter is not found", () => {
        expect(() => {
            stringBisect("abc", "@@");
        }).toThrow('Occurrence index out of bounds.');
    });

    // Throws when occurrence is 0
    test("throws error for occurrence 0", () => {
        expect(() => {
            stringBisect("a::b", "::", 0);
        }).toThrow('Occurrence "0" is not allowed. Use a non-zero number, "first" or "last".');
    });

    // Throws when occurrence exceeds number of delimiters
    test("throws error for out-of-bounds occurrence", () => {
        expect(() => {
            stringBisect("a::b", "::", 3);
        }).toThrow('Occurrence index out of bounds.');
    });

    // Throws when delimiter is an empty string
    test("throws error when delimiter is empty string", () => {
        expect(() => {
            stringBisect("abc", "");
        }).toThrow('Delimiter cannot be an empty string.');
    });

    // Negative occurrence (e.g. -1 = last)
    test("splits at last occurrence using negative index", () => {
        const [head, tail] = stringBisect("a::b::c", "::", -1);
        expect(head).toBe("a::b");
        expect(tail).toBe("c");
    });
});
