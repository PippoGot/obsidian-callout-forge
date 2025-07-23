import { CalloutForgeError } from "errors"; // Import custom error class
import { splitOnFirstMatch } from "utility"; // Import utility function for splitting strings


// Function to extract configuration dictionary from the source string
// This function expects the source to be in the format:
// key1: value1
// key2: value2
// ...
// ---
// content starts here
export function parseCodeBlock(source: string): Record<string, string> {
    // Split the source into configuration and content parts
    // The configuration is the first part before the first "---" occurrence
    // The content is the rest of the string
    const [config, content] = splitOnFirstMatch(source, /^\s*---\s*$/m);

    // If no configuration is provided, throw an error
    if (!config) {
        throw new CalloutForgeError("No configuration provided in the code block.");
    }

    // Parse the configuration into a dictionary
    const configDict = Object.fromEntries(
        config.split("\n").map(line => {
            const [key, ...rest] = line.split(":");
            return [key.trim(), rest.join(":").trim()];
        })
    );

    // If "template" is not a key in the configuration or has no value, throw an error
    if (!configDict.template || configDict.template.trim() === "") {
        throw new CalloutForgeError("No template specified in the configuration.");
    }

    // Append content to the configuration dictionary if it exists
    if (content.trim() !== "") {
        configDict.content = content.trim();
    }

    return configDict;
}
