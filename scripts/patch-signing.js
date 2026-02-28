#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

if (!fs.existsSync(buildGradlePath)) {
  console.error('build.gradle not found');
  process.exit(1);
}

let content = fs.readFileSync(buildGradlePath, 'utf8');

// Add release signing config after debug signing config
const releaseSigningConfig = `
        release {
            if (System.getenv("KEYSTORE_PASSWORD")) {
                storeFile file('release.keystore')
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }`;

// Find the debug signing config closing brace and add release config after it
content = content.replace(
  /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\})\s*(\})/,
  `$1${releaseSigningConfig}\n    $2`
);

// Update release buildType to use release signing when available
content = content.replace(
  /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
  '$1signingConfig System.getenv("KEYSTORE_PASSWORD") ? signingConfigs.release : signingConfigs.debug'
);

fs.writeFileSync(buildGradlePath, content);
console.log('Patched build.gradle with release signing config');
