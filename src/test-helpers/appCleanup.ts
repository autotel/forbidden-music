import { afterAll } from "vitest";
import { TestRuntime } from "./testRuntime";

export const appCleanup = (
    { app, body, containerDiv }: TestRuntime
) => {
    afterAll(async () => {
        app.unmount()
        body.removeChild(containerDiv);
        
        localStorage.clear();
    })
}