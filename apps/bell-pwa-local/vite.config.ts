import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl({
    /** name of certification */
    name: 'test',
    /** custom trust domains */
    domains: ['*.krakatica.local', 'krakatica.local', 'krakatica.local:5173', 'localhost', 'localhost:5173'],
    certDir: './certs',
  })],
  server: {
    https: true,
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['krakatica.local', 'localhost']
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        sw: 'src/sw.ts',
      },
      output: {
        entryFileNames: assetInfo => {
          return assetInfo.name === 'sw' 
            ? '[name].js'                       // put service worker in root
            : 'assets/js/[name]-[hash].js'      // others in assets/js
        },
      },
    },
  },
});
