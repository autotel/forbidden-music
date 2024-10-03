

export default (obj: Object, attributes: string[], guideStr: string) => {
    for (const attr of attributes) {
        if (!obj.hasOwnProperty(attr)) {
            console.error(guideStr, obj);
            throw new Error(`Object must have attribute ${attr} in ${guideStr}`);
        }
    }
}