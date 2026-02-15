import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:2000",
                changeOrigin: true,
            },
            "/ws": {
                target: "ws://localhost:2000",
                ws: true,
            },
        },
    },
    build: {
        outDir: "../static",
        emptyOutDir: true,
    },
});
