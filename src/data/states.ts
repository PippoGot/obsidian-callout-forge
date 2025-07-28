// Define State interface
interface State {
    name: string;
    utilityData: any;
}

// Define ErrorState type
type ErrorState = {
    name: string;
    utilityData: string;
}

// Define FunctionalState type
type FunctionalState = {
    name: string;
    utilityData: Record<string, State>;
}

const ParserStates = {
    CodeblockStart: { name: "", utilityData: {} },
    PropertyStart: { name: "", utilityData: {} },
    PropertyText: { name: "", utilityData: {} },
    CodefenceStart: { name: "", utilityData: {} },
    CodefenceText: { name: "", utilityData: {} },
    CodefenceEnd: { name: "", utilityData: {} },
    CodeblockEnd: { name: "", utilityData: {} },
    ParsingError: { name: "", utilityData: "" },
}