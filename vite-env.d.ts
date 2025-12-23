// Fix: Comment out missing type definition and provide manual process declaration to avoid build errors
// /// <reference types="vite/client" />

declare const process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};