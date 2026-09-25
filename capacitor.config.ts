import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.asemansara.tlift',
  appName: 'آسمانسرا',
  webDir: 'dist',
  server: {
    url: 'https://emami-asemansara.ir',
    cleartext: false,
    allowNavigation: ['emami-asemansara.ir', '*.emami-asemansara.ir'],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#111827',
  },
};

export default config;
