import { MidiInputHandlerFactory } from "./inputHandlerTypes";

const midiLog = (...p: (string | number)[]) => {
    const transformedLog = p.map((p) => {
        if (typeof p === "number") {
            return p.toString(16)
        }
        return p
    });
    console.log(...transformedLog)
}

const devInputHandler:MidiInputHandlerFactory = (
    tick: () => void, 
    play:()=>void, 
    stop:()=>void, 
    skip:(to:number)=>void
) => ({
    name: "dev-log",
    notes: [],
    inputAction(midi: number[], timeStamp: number) {
        midiLog(" >> ", ...midi);
    }
})
export default devInputHandler;