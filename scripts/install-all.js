#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { cwd: rootDir, encoding: 'utf8', ...options });
}

function getConnectedDevices() {
  try {
    const output = run('adb devices', { stdio: 'pipe' });
    const lines = output.trim().split('\n').slice(1); // Skip header
    return lines
      .filter(line => line.includes('\tdevice'))
      .map(line => line.split('\t')[0]);
  } catch (error) {
    console.error('Error: adb not found. Make sure Android SDK platform-tools is in your PATH.');
    process.exit(1);
  }
}

function getDeviceName(deviceId) {
  try {
    const model = execSync(`adb -s ${deviceId} shell getprop ro.product.model`, { encoding: 'utf8' }).trim();
    return model || deviceId;
  } catch {
    return deviceId;
  }
}

function installOnDevice(deviceId, apkPath) {
  return new Promise((resolve) => {
    const deviceName = getDeviceName(deviceId);
    console.log(`\n📱 Installing on ${deviceName} (${deviceId})...`);

    const adb = spawn('adb', ['-s', deviceId, 'install', '-r', apkPath], { cwd: rootDir });

    adb.stdout.on('data', (data) => process.stdout.write(data));
    adb.stderr.on('data', (data) => process.stderr.write(data));

    adb.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ Installed on ${deviceName}`);
        resolve({ deviceId, deviceName, success: true });
      } else {
        console.error(`✗ Failed to install on ${deviceName}`);
        resolve({ deviceId, deviceName, success: false });
      }
    });
  });
}

async function main() {
  const skipBuild = process.argv.includes('--skip-build');
  const apkPath = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

  // Get connected devices
  const devices = getConnectedDevices();

  if (devices.length === 0) {
    console.error('No devices connected. Connect a device and try again.');
    process.exit(1);
  }

  console.log(`Found ${devices.length} device(s):`);
  devices.forEach(d => console.log(`  - ${getDeviceName(d)} (${d})`));

  // Build if needed
  if (!skipBuild) {
    console.log('\n🔨 Building debug APK...\n');
    try {
      run('npx expo run:android --no-install', { stdio: 'inherit' });
    } catch (error) {
      console.error('Build failed');
      process.exit(1);
    }
  }

  // Install on all devices in parallel
  console.log('\n📦 Installing on all devices...');
  const results = await Promise.all(devices.map(d => installOnDevice(d, apkPath)));

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n${'='.repeat(40)}`);
  console.log(`✓ Installed: ${successful}/${devices.length}`);
  if (failed > 0) {
    console.log(`✗ Failed: ${failed}/${devices.length}`);
  }
}

main();
