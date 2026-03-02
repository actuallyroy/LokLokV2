const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to add ProGuard rules and DrawingSyncService for release builds
 */
function withProguardRules(config) {
  // Add ProGuard rules
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );

      const additionalRules = `
# Keep Expo modules
-keep class expo.modules.** { *; }
-keep class com.loklok.app.** { *; }

# Keep WallpaperModule specifically
-keep class expo.modules.wallpaper.** { *; }
-keepclassmembers class expo.modules.wallpaper.** { *; }

# Keep DrawingSyncService
-keep class com.loklok.app.DrawingSyncService { *; }
`;

      if (fs.existsSync(proguardPath)) {
        let content = fs.readFileSync(proguardPath, 'utf8');

        // Only add if not already present
        if (!content.includes('expo.modules.wallpaper')) {
          content += additionalRules;
          fs.writeFileSync(proguardPath, content);
        }
      }

      return config;
    },
  ]);

  // Add DrawingSyncService to AndroidManifest
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Check if service already exists
    const services = application.service || [];
    const serviceExists = services.some(
      (s) => s.$['android:name'] === '.DrawingSyncService'
    );

    if (!serviceExists) {
      application.service = [
        ...services,
        {
          $: {
            'android:name': '.DrawingSyncService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:foregroundServiceType': 'dataSync',
          },
        },
      ];
    }

    return config;
  });

  return config;
}

module.exports = withProguardRules;
