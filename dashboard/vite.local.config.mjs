import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "https://kutkhronos.khoraurbanthinkers.es",
        changeOrigin: true,
        secure: true,
        headers: {
          "X-Frappe-Site-Name": "kutkhronos.khoraurbanthinkers.es",
        },
      },
    },
    host: 'localhost',
    port: 5173

  }
});
