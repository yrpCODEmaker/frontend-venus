import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces()

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address
      }
    }
  }

  return '127.0.0.1'
}

const detectedLocalIp = getLocalNetworkIp()
console.log(`[Vite] IP local detectada para desarrollo: ${detectedLocalIp}`)

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_LOCAL_MACHINE_IP': JSON.stringify(detectedLocalIp)
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/uploads': {
        target: `http://${detectedLocalIp}:8000`,
        changeOrigin: true
      }
    }
  }
})
