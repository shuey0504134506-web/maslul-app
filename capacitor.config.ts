import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor עוטף את קוד ה-Web (dist/) בתוך קליפה נייטיבית עם WebView מובנה.
 * המשמעות: הטלפון לא זקוק לדפדפן משלו בכלל - ה-APK מביא איתו את מנוע התצוגה.
 *
 * androidScheme: 'https' - חשוב במיוחד עבור Firebase Auth, שדורש הקשר מאובטח (secure context)
 * כדי לעבוד כראוי גם בתוך WebView.
 */
const config: CapacitorConfig = {
  appId: 'app.maslul.milestones',
  appName: 'מסלול',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
