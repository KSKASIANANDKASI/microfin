// app.json holds the static config; this adds what must not be committed.
// Expo loads apps/mobile/.env before evaluating it.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    // Writes the key into AndroidManifest.xml on prebuild; iOS uses Apple Maps
    // and needs none. Rebuild the app after changing it.
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY }],
  ],
});
