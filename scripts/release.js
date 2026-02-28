#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const appJsonPath = path.join(rootDir, 'app.json');
const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');

const bumpType = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Usage: node scripts/release.js [major|minor|patch]');
  console.error('  major: 1.0.0 -> 2.0.0');
  console.error('  minor: 1.0.0 -> 1.1.0');
  console.error('  patch: 1.0.0 -> 1.0.1 (default)');
  process.exit(1);
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
}

// Read current version
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
const newVersion = bumpVersion(currentVersion, bumpType);

console.log(`\nBumping version: ${currentVersion} -> ${newVersion}\n`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('Updated package.json');

// Update app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
appJson.expo.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log('Updated app.json');

// Update android/app/build.gradle
if (fs.existsSync(buildGradlePath)) {
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

  // Update versionName
  buildGradle = buildGradle.replace(
    /versionName\s+"[\d.]+"/,
    `versionName "${newVersion}"`
  );

  // Increment versionCode
  const versionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);
  if (versionCodeMatch) {
    const newVersionCode = parseInt(versionCodeMatch[1]) + 1;
    buildGradle = buildGradle.replace(
      /versionCode\s+\d+/,
      `versionCode ${newVersionCode}`
    );
    console.log(`Updated build.gradle (versionCode: ${newVersionCode})`);
  }

  fs.writeFileSync(buildGradlePath, buildGradle);
}

// Git operations
console.log('\nCommitting and tagging...\n');

run('git add package.json app.json');
run('git add -f android/app/build.gradle');
run(`git commit -m "chore: bump version to ${newVersion}"`);
run(`git tag v${newVersion}`);

console.log('\nPushing to remote...\n');

run('git push');
run('git push --tags');

console.log(`\n✓ Released v${newVersion}`);
console.log('GitHub Actions will now build and create the release.');
