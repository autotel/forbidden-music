// TODO: I used enum to make the code nicer, it actually made everything worse.

export enum Tool {
    Select,
    Edit,
    // Audition,
    // Navigate,
}

interface ToolCase {
    name: string;
    tool: Tool;
}

export const toolCasesArray = (): Array<ToolCase> => {
    return [
        {
            name: "Select",
            tool: Tool.Select,
        },
        {
            name: "Edit",
            tool: Tool.Edit,
        },
        // {
        //     name: "Audition",
        //     tool: Tool.Audition,
        // },
        // {
        //     name: "Navigate",
        //     tool: Tool.Navigate,
        // },
    ];
};
