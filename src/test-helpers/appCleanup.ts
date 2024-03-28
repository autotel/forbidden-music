import { afterAll } from "vitest";
import { TestRuntime } from "./testRuntime";

export const appCleanup = (
    { app, body, containerDiv, interactionProtectDiv }: TestRuntime
) => {
    afterAll(async () => {
        app.unmount()
        body.removeChild(containerDiv);
        body.removeChild(interactionProtectDiv);
        localStorage.clear();
    })
}