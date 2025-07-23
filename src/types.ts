
// Class for template parameters
// This defines the structure of parameters that can be used in templates
export class TemplateParameter {
    key: string;
    isRequired: boolean;
    defaultValue?: string;

    // Constructor to initialize the TemplateParameter instance
    // key: the name of the parameter
    // isRequired: whether the parameter is required or optional
    // defaultValue: the default value for the parameter if it is optional
    constructor(key: string, isRequired: boolean, defaultValue?: string) {
        this.key = key;
        this.isRequired = isRequired;
        this.defaultValue = defaultValue;
    }

    // Method to check if two TemplateParameter instances are equal
    // This is used to avoid conflicts when parameters with the same key are defined
    equals(other: TemplateParameter): boolean {
        return (
            this.key === other.key &&
            this.isRequired === other.isRequired &&
            this.defaultValue === other.defaultValue
        );
    }
}