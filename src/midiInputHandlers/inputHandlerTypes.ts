export type MidiInputHandlerReturn = { [key: string]: any } & {
    name: string;
    notes: string[];
    inputAction(midi: number[], timeStamp: number): void;
}

export type MidiInputHandlerFactory = (
    /**
     * what to do when midi requests a tick
     */
    tick: () => void, 
    /**
     * what to do when midi requests to start
     */
    play: () => void, 
    /**
     * what to do when midi requests to stop
     */
    stop: () => void, 
    /**
     * what to do when midi requests to jump in time
     * @param to represents the musical time
     */
    skip: (to: number) => void
) => MidiInputHandlerReturn;