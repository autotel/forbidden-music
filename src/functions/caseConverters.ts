
export const titleCase = <T extends (string | undefined)>(str: T) => {
    if (!str) return str;
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

export const sampleNameToUName = <T extends (string | undefined)>(name?: T) => {
    if (!name) return name;
    return titleCase(
        camelCaseToUName(name)
            .replace(/[^a-zA-Z0-9]/g, " ").replace(/ +/g, " ")
    ).trim();
}

export const camelCaseToUName = <T extends (string | undefined)>(name: T) => {
    if (!name) return name;
    return titleCase(name.replace(/([A-Z])/g, " $1")).trim();
}