const midiLog = (...p: (string | number)[]) => {
    const transformedLog = p.map((p) => {
        if (typeof p === "number") {
            return p.toString(16)
        }
        return p
    });
    console.log(...transformedLog)
}



const reaperMidiInputHandler = (clockTickCallback: () => void) => ({
    name: "reaper",
    messageState: 0,
    nibbleAction(...midi: number[]) {
        const [status, b1, b2] = midi;
        const head = status & 0xf0
        switch (head) {
            case 0x9:
                midiLog("note on", b1, b2);
                return true;
            case 0x8:
                midiLog("note off", b1, b2);
                return true;
        }
        return false;

    },
    caseAction(...midi:number[]){
        if(!this.messageState) return false;
        midiLog("\t>>",...midi);
        return true;
    },
    inputAction(...midi: number[]) {
        if (this.caseAction(...midi)){
            return;
        }
        if (this.nibbleAction(...midi)) {
            return;
        }
    }
})
export default reaperMidiInputHandler;