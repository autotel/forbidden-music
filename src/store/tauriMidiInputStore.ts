import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import isTauri from "../functions/isTauri";

export const useTauriMidiInputStore = defineStore("tauri-midi-input",async () => {
    
    if(!isTauri()) return;

    const devices = await invoke('list_midi_connections')

    const devicesObject = devices as { [key: string]: string }
    const midiConnectionKeys = Object.keys(devicesObject as {})
    midiConnectionKeys.forEach((ck) => {
        console.log(ck)
    })
    
    await invoke('open_midi_connection', { inputIdx: 1 });

    listen('midi_message', event => {
        console.log(event)
    })


});