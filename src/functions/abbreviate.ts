
const replaceableWords:{[key:string]:string} = {
    filter:'flt',
    oscillator:'osc',
    frequency:'fq',
    amount:'amt',
    envelope:'env',
    attack:'atk',
    decay:'dec',
    sustain:'sus',
    release:'rel',
    curve:'crv',
    modulator:'mod',
}


// abbreviate leaving only first letters of words
export const abrevAcronym = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
        return str;
    }

    const words = str.split(" ");
    let result = "";
    for (let i = 0; i < words.length; i++) {
        result += words[i][0];
    }
    return result.toUpperCase();
}


// cuts words to max length regardless
export const abbrevTruncate = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
        return str;
    }

    return str.slice(0, maxLength - 3);
}

// abbreviates by removing vowels
export const abbrevConsonants = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
        return str;
    }

    const vowels = ['a', 'e', 'i', 'o', 'u'];
    let count = 0;

    let result = str[0];

    for (let i = 1; i < str.length; i++) {
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

// abbreviate using replaceable words
const abbreviateReplacing = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
        return str;
    }

    let result = str.toLowerCase();
    for (let key in replaceableWords) {
        result = result.replace(key, replaceableWords[key]);
    }
    return result;
}

export const abbreviate = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
        return str;
    }
    
    let resultString = abbreviateReplacing(str, maxLength);

    if(resultString.length <= maxLength){
        return resultString;
    }
    
    resultString = abbrevConsonants(resultString, maxLength);

    if(resultString.length <= maxLength){
        return resultString;
    }

    const containsSpaces = str.includes(" ");
    
    if (containsSpaces) {
        resultString = abrevAcronym(str, maxLength);
    } 

    if(resultString.length <= maxLength){
        return resultString;
    }

    resultString = abbrevTruncate(resultString, maxLength);

    return resultString.trim() + ".";
}
