import { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.lokavaluto.monujo",
  appName: "Monujo",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    url: "http://192.168.97.83:8080",
    cleartext: true,
  },
}

export default config
