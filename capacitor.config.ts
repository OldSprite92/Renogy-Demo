import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.renogy.onevision.demo',
  appName: 'Renogy ONE Vision',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#071116',
  },
};

export default config;
