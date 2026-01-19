import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.troika.callingdashboard',
  appName: 'Calling Dashboard',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Note: Push notifications require google-services.json file in android/app/ directory
    // Download from Firebase Console and place in the correct location for push notifications to work
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
