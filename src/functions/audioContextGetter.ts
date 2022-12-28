const context = new window.AudioContext();

export const getAudioContext = () => {
    return context;
}

export const waitRunningContext = async () => {
    if(context.state === "running") return context;
    
    document.addEventListener("click", () => {
        context.resume().then(() => {
            console.log("resumed audio cotext. now",context.state);
        });
        return context;
    });
};