export type TreeStucture<T> = {
    value: T
    children: TreeStucture<T>[]
}

export const traverse = <T>(containerLevel: TreeStucture<T>, callback: (loop: TreeStucture<T>, level: number) => void, level = 0) => {
    for (const contained of containerLevel.children) {
        traverse(contained, callback, level + 1);
    }
    callback(containerLevel, level);
}
