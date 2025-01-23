import { defineConfig } from "vite";

export default defineConfig({
  test: {
    browser: {
      providerOptions: {
        capabilities: {
          'goog:chromeOptions': {
            args: ['disable-gpu', 'no-sandbox', 'disable-setuid-sandbox']
          }
        }
      }
    }
  }
})