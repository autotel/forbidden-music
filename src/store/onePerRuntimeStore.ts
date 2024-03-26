import { defineStore } from "pinia";

const onePerRuntimeStore = defineStore('one per runtime', ()=>{
    const existingKeys:{[key:string]:any[]} = {};
    const add = (key:string, value:any)=>{
        if(!existingKeys[key]){
            existingKeys[key] = [];
        }
        existingKeys[key].push(value);
    }
    const get = (key:string)=>{
        if(!existingKeys[key]){
            throw new Error(`No key ${key} found`);
        }
        return existingKeys[key];
    }
    const getOrAdd = (key:string, value:any)=>{
        if(existingKeys[key]){
            return existingKeys[key];
        }
        return add(key, value);
    }
    const keyExists = (key:string)=>{
        return !!existingKeys[key];
    }
    return {
        add,
        get,
        getOrAdd,
        keyExists,
    }
});
export default onePerRuntimeStore;