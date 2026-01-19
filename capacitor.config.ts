import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.troika.callingdashboard',
  appName: 'Calling Dashboard',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true // Allow HTTP for development
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a2e",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    }
  }
};

export default config;
