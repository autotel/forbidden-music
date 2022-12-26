const context = new window.AudioContext();

export const getAudioContext = () => {
    return context;
}

export const waitRunningContext = async () => {
    if(context.state === "running") return context;
    
    document.addEventListener("click", () => {
        context.resume();
        return context;
    });
};