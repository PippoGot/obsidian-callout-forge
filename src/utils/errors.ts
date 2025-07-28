// Custom error class for CalloutForge errors
// This allows for better error handling and debugging
export class CalloutForgeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CalloutForgeError";
    }
}