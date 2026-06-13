// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
    vite: {
        server: {
            allowedHosts: ['randompicks.es', 'www.randompicks.es'],
            watch: {
                ignored: [
                    '**/.vs/**',
                    '**/.git/**',
                    '**/node_modules/**',
                ],
            },
        },
    },
});