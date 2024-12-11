export default (timeMs: number) => new Promise((resolve)=>{
    setTimeout(resolve, timeMs)
});