/**
 * Object which is not fully usable at construction, but needs to call an async enable method.
 */
export type AsyncEnableObject<ReadyPromiseContent = void> = {
    waitReady: Promise<ReadyPromiseContent>
    markReady: (ready?: ReadyPromiseContent) => void
}
