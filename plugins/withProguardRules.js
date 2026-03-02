const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to add ProGuard rules for release builds
 * Keeps Expo modules and WallpaperModule from being stripped
 */
function withProguardRules(config) {
  return withDangerousMod(config, [
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
}

module.exports = withProguardRules;
