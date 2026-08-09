import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import os from 'os'

// Obtiene la IP local IPv4 de la máquina ejecutando comandos de Windows (PowerShell / ipconfig)
function getWindowsLocalIp() {
  try {
    const output = execSync('powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike \'127.*\' -and $_.IPAddress -notlike \'169.254.*\'} | Select-Object -ExpandProperty IPAddress -First 1"', { encoding: 'utf8', timeout: 2000 }).trim()
    if (output && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(output)) {
      return output
    }
  } catch (e) {
    try {
      const output = execSync('ipconfig', { encoding: 'utf8', timeout: 2000 })
      const matches = output.match(/(?:IPv4 Address|Dirección IPv4)[. ]*:\s*([\d.]+)/g)
      if (matches) {
        for (const match of matches) {
          const ip = match.split(':')[1].trim()
          if (ip && !ip.startsWith('127.') && !ip.startsWith('169.254.')) {
            return ip
          }
        }
      }
    } catch (err) {}
  }

  // Fallback con os.networkInterfaces
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address
      }
    }
  }
  return '127.0.0.1'
}

const detectedLocalIp = getWindowsLocalIp()
console.log(`[Vite Build/Dev] IP local detectada via comando Windows: ${detectedLocalIp}`)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_LOCAL_MACHINE_IP': JSON.stringify(detectedLocalIp)
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/uploads': {
        target: `http://${detectedLocalIp}:8000`,
        changeOrigin: true
      }
    }
  }
})
