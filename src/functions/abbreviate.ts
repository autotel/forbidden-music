

// cuts words to max length regardless
export const abbreviate3 = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
        return str;
    }

    return str.slice(0, maxLength - 3);
}

// abbreviates by removing vowels
export const abbreviate2 = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
        return str;
    }

    const vowels = ['a', 'e', 'i', 'o', 'u'];
    let count = 0;
    let result = '';
    const endAt = maxLength - 1;
    for (let i = 0; i < str.length; i++) {
        if (vowels.includes(str[i])) {
            continue;
        }

        result += str[i];
        count++;

        if (count >= maxLength) {
            break;
        }
    }

    return result;
}


export const abbreviate = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
        return str;
    }
    let resultString = abbreviate2(str, maxLength);
    if (resultString.length > maxLength) {
        resultString = abbreviate3(str, maxLength);
    }
    return resultString.trim()+".";
}
