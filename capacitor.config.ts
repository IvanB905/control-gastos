import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Provisional identifier. Confirm before creating store listings; changing it
  // after the first public release would create a different app.
  appId: 'com.ivanb905.finanza',
  appName: 'Finanza',
  webDir: 'dist',
  ios: {
    // Use CSS env(safe-area-inset-*) consistently with the app shell and bottom navigation.
    contentInset: 'never',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SystemBars: {
      // Handles edge-to-edge insets in recent Android WebViews and falls back
      // to native WebView margins on older Android System WebViews.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
