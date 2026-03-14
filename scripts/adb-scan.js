const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Cache file path
const CACHE_FILE = path.join(__dirname, '.adb-cache.json');

// Load cached IP from file
function loadCachedIP() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      const cache = JSON.parse(data);
      return cache.lastSuccessfulIP;
    }
  } catch (error) {
    console.log('⚠️  Could not load cache file');
  }
  return null;
}

// Save successful IP to cache
function saveCachedIP(ip) {
  try {
    const cache = {
      lastSuccessfulIP: ip,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log(`💾 Saved ${ip} to cache`);
  } catch (error) {
    console.log('⚠️  Could not save to cache file');
  }
}

// Get local IP address and subnet
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const allIPv4 = [];

  // Collect all IPv4 addresses
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        allIPv4.push({ name, address: iface.address });
      }
    }
  }

  // First priority: Wi-Fi adapters
  const wifi = allIPv4.find(i =>
    i.name.toLowerCase().includes('wi-fi') ||
    i.name.toLowerCase().includes('wifi') ||
    i.name.toLowerCase().includes('wireless')
  );

  if (wifi) {
    console.log(`🔍 Using Wi-Fi adapter: ${wifi.name}`);
    return wifi.address;
  }

  // Second priority: Ethernet adapters (but not virtual ones)
  const ethernet = allIPv4.find(i =>
    i.name.toLowerCase().includes('ethernet') &&
    !i.name.toLowerCase().includes('vethernet') &&
    !i.name.toLowerCase().includes('hyper-v')
  );

  if (ethernet) {
    console.log(`🔍 Using Ethernet adapter: ${ethernet.name}`);
    return ethernet.address;
  }

  // Third priority: Any 192.168.x.x address (common home networks)
  const homeNetwork = allIPv4.find(i => i.address.startsWith('192.168.'));

  if (homeNetwork) {
    console.log(`🔍 Using home network adapter: ${homeNetwork.name}`);
    return homeNetwork.address;
  }

  // Last resort: first available
  if (allIPv4.length > 0) {
    console.log(`🔍 Using adapter: ${allIPv4[0].name}`);
    return allIPv4[0].address;
  }

  return '192.168.0.1';
}

// Ping an IP to check if it's alive
async function pingIP(ip) {
  const pingCmd = process.platform === 'win32' 
    ? `ping -n 1 -w 500 ${ip}` 
    : `ping -c 1 -W 1 ${ip}`;
  
  try {
    await execAsync(pingCmd);
    return true;
  } catch {
    return false;
  }
}

// Try to connect to ADB on a specific IP
async function tryADBConnect(ip) {
  const port = 5000;
  const address = `${ip}:${port}`;
  
  try {
    console.log(`🔄 Attempting to connect to ${address}...`);
    const { stdout, stderr } = await execAsync(`adb connect ${address}`);
    
    // Check for failure indicators first
    if (stdout.includes('cannot connect') || stdout.includes('failed') || stdout.includes('refused') || stdout.includes('10060') || stdout.includes('10061')) {
      console.log(`❌ Failed to connect to ${address}: ${stdout.trim()}`);
      return { success: false, address, message: stdout.trim() };
    }
    
    // Then check for success - must be "connected to" not "cannot connect to"
    if ((stdout.includes('connected to') || stdout.includes('already connected')) && !stdout.includes('cannot')) {
      console.log(`✅ Successfully connected to ${address}`);
      return { success: true, address, message: stdout.trim() };
    } else {
      console.log(`❌ Failed to connect to ${address}: ${stdout.trim()}`);
      return { success: false, address, message: stdout.trim() };
    }
  } catch (error) {
    console.log(`❌ Error connecting to ${address}: ${error.message}`);
    return { success: false, address, error: error.message };
  }
}

// Disconnect from a device
async function disconnectDevice(address) {
  try {
    const { stdout } = await execAsync(`adb disconnect ${address}`);
    return { success: true, message: stdout.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main scanning function
async function scanAndConnect(skipPing = false) {
  console.log('🔍 Starting network scan for ADB devices...\n');
  
  // Get local IP and derive subnet
  const localIP = getLocalIP();
  const subnet = localIP.substring(0, localIP.lastIndexOf('.'));
  console.log(`📡 Local IP: ${localIP}`);
  console.log(`🌐 Scanning subnet: ${subnet}.0/24\n`);
  
  // First, check if there's already a connected device
  try {
    const { stdout } = await execAsync('adb devices');
    console.log('📱 Currently connected devices:');
    console.log(stdout);
    
    // Parse connected devices
    const lines = stdout.split('\n');
    let connectedDevice = null;
    let hasOfflineDevices = false;
    
    for (const line of lines) {
      if (line.includes(':5000')) {
        if (line.includes('device') && !line.includes('offline')) {
          // Found a connected device
          const address = line.split('\t')[0].trim();
          connectedDevice = address;
        } else if (line.includes('offline')) {
          hasOfflineDevices = true;
        }
      }
    }
    
    // If we have a connected device and no offline devices, we're done!
    if (connectedDevice && !hasOfflineDevices) {
      console.log(`\n✅ Already connected to: ${connectedDevice}`);
      console.log('📊 Skipping scan - device already connected!\n');
      
      // Save this IP to cache for future use
      const ipOnly = connectedDevice.split(':')[0];
      saveCachedIP(ipOnly);
      
      // Setup Metro bundler connection
      console.log('🔗 Setting up Metro bundler connection...');
      try {
        const { stdout } = await execAsync('adb reverse tcp:8081 tcp:8081');
        console.log('✅ Metro bundler connection established (tcp:8081)');
      } catch (error) {
        console.log('⚠️  Could not setup Metro connection:', error.message);
      }
      console.log();
      
      return; // Exit early - we're already connected!
    }
    
    // Otherwise, disconnect any problematic connections and proceed with scan
    for (const line of lines) {
      if (line.includes(':5000') && (line.includes('device') || line.includes('offline'))) {
        const address = line.split('\t')[0].trim();
        console.log(`🔌 Disconnecting from ${address}...`);
        const result = await disconnectDevice(address);
        console.log(`   ${result.success ? '✅' : '❌'} ${result.success ? result.message : result.error}`);
      }
    }
    console.log('---\n');
  } catch (error) {
    console.log('⚠️  Could not list current devices\n');
  }
  
  // Try cached IP first
  const cachedIP = loadCachedIP();
  let successfulConnection = null;
  
  if (cachedIP) {
    console.log(`🚀 Trying cached IP: ${cachedIP}:5000\n`);
    const cachedResult = await tryADBConnect(cachedIP);
    if (cachedResult.success) {
      successfulConnection = cachedResult;
      console.log(`✨ Successfully connected to cached IP: ${cachedResult.address}\n`);
      
      // Setup Metro bundler connection
      console.log('🔗 Setting up Metro bundler connection...');
      try {
        const { stdout } = await execAsync('adb reverse tcp:8081 tcp:8081');
        console.log('✅ Metro bundler connection established (tcp:8081)\n');
      } catch (error) {
        console.log('⚠️  Could not setup Metro connection:', error.message);
      }
      
      // Skip full scan if cached IP worked
      console.log('📊 Quick Connect Results:');
      console.log('========================');
      console.log(`✅ Connected to: ${successfulConnection.address}`);
      console.log(`Message: ${successfulConnection.message}`);
      
      // List final ADB devices
      console.log('\n📱 Final ADB device list:');
      try {
        const { stdout } = await execAsync('adb devices');
        console.log(stdout);
      } catch (error) {
        console.log('Could not list devices');
      }
      
      return; // Exit early - we're done!
    } else {
      console.log(`❌ Cached IP ${cachedIP}:5000 failed, falling back to full scan...\n`);
    }
  } else {
    console.log('📋 No cached IP found, performing full scan...\n');
  }
  
  let targetIPs = [];
  const connectedDevices = [];
  
  // Check for --all flag to skip ping check
  const args = process.argv.slice(2);
  const skipPingCheck = args.includes('--all') || skipPing;
  
  if (skipPingCheck) {
    console.log('🔎 Trying ALL IPs in subnet (skipping ping check)...\n');
    // Try all IPs without ping
    for (let i = 1; i <= 254; i++) {
      targetIPs.push(`${subnet}.${i}`);
    }
  } else {
    // Scan with ping first
    console.log('🔎 Scanning for active hosts (use --all to skip ping check)...');
    
    const pingPromises = [];
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;
      pingPromises.push(
        pingIP(ip).then(isAlive => {
          if (isAlive) {
            process.stdout.write(`✓`);
            targetIPs.push(ip);
          } else {
            process.stdout.write('.');
          }
          return { ip, isAlive };
        })
      );
    }
    
    await Promise.all(pingPromises);
    console.log('\n');
    
    // Also try some common Android device IPs even if ping fails
    const commonAndroidIPs = [
      `${subnet}.40`, `${subnet}.41`, `${subnet}.42`, `${subnet}.43`,
      `${subnet}.44`, `${subnet}.45`, `${subnet}.46`, `${subnet}.47`,
      `${subnet}.100`, `${subnet}.101`, `${subnet}.102`, `${subnet}.103`
    ];
    
    for (const ip of commonAndroidIPs) {
      if (!targetIPs.includes(ip)) {
        targetIPs.push(ip);
      }
    }
  }
  
  console.log(`\n🖥️  Checking ${targetIPs.length} IPs for ADB...\n`);
  
  // Try connecting to each IP on port 5000
  if (targetIPs.length > 0) {
    console.log('🔌 Attempting ADB connections on port 5000...\n');
    
    let successfulConnection = null;
    
    // Process in batches to avoid overwhelming
    const batchSize = skipPingCheck ? 10 : targetIPs.length;
    for (let i = 0; i < targetIPs.length; i += batchSize) {
      const batch = targetIPs.slice(i, i + batchSize);
      const batchPromises = batch.map(async (ip) => {
        const result = await tryADBConnect(ip);
        if (result.success) {
          return result;
        }
        return null;
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        if (result && result.success) {
          connectedDevices.push(result);
          
          // If we already have a successful connection, disconnect from this one
          if (successfulConnection) {
            console.log(`🔌 Disconnecting from ${result.address} (keeping only one device)...`);
            const disconnectResult = await disconnectDevice(result.address);
            console.log(`   ${disconnectResult.success ? '✅' : '❌'} ${disconnectResult.success ? disconnectResult.message : disconnectResult.error}`);
          } else {
            successfulConnection = result;
            console.log(`✨ Keeping connection to ${result.address}`);
            
            // Save successful IP to cache
            const ipOnly = result.address.split(':')[0];
            saveCachedIP(ipOnly);
          }
        }
      }
    }
    
    console.log('\n📊 Scan Results:');
    console.log('================');
    console.log(`Total IPs checked: ${targetIPs.length}`);
    console.log(`Total devices found: ${connectedDevices.length}`);
    
    if (successfulConnection) {
      console.log(`\n✅ Connected to: ${successfulConnection.address}`);
      console.log(`Message: ${successfulConnection.message}`);
      
      // Setup Metro bundler connection
      console.log('\n🔗 Setting up Metro bundler connection...');
      try {
        const { stdout } = await execAsync('adb reverse tcp:8081 tcp:8081');
        console.log('✅ Metro bundler connection established (tcp:8081)');
      } catch (error) {
        console.log('⚠️  Could not setup Metro connection:', error.message);
      }
    } else {
      console.log('\n❌ No ADB devices found on port 5000');
      console.log('\n💡 Tip: Make sure ADB over network is enabled on your Android device:');
      console.log('   1. Enable Developer Options');
      console.log('   2. Enable USB debugging');
      console.log('   3. Enable Wireless debugging or ADB over network');
      console.log('   4. Try running with --all flag to check all IPs: yarn adb-scan --all');
    }
    
    // Final cleanup - ensure only one device is connected
    console.log('\n🧹 Final cleanup check...');
    try {
      const { stdout } = await execAsync('adb devices');
      const lines = stdout.split('\n');
      const networkDevices = [];
      
      for (const line of lines) {
        if (line.includes(':5000') && (line.includes('device') || line.includes('offline'))) {
          const address = line.split('\t')[0].trim();
          const status = line.split('\t')[1]?.trim();
          networkDevices.push({ address, status });
        }
      }
      
      if (networkDevices.length > 1) {
        console.log(`Found ${networkDevices.length} network devices, cleaning up...`);
        
        // Prioritize keeping the successful connection if we have one
        const keepAddress = successfulConnection ? successfulConnection.address : null;
        
        for (const device of networkDevices) {
          // Disconnect if: it's offline OR it's not our successful connection
          if (device.status === 'offline' || (keepAddress && device.address !== keepAddress)) {
            console.log(`🔌 Disconnecting from ${device.address} (${device.status})...`);
            await disconnectDevice(device.address);
          } else if (keepAddress && device.address === keepAddress) {
            console.log(`✅ Keeping connection to ${device.address}`);
          }
        }
        
        // If no successful connection, just keep the first online device
        if (!keepAddress) {
          const onlineDevice = networkDevices.find(d => d.status === 'device');
          if (onlineDevice) {
            console.log(`✅ Keeping first online device: ${onlineDevice.address}`);
          }
        }
      }
    } catch (error) {
      console.log('Could not perform final cleanup');
    }
    
    // List final ADB devices
    console.log('\n📱 Final ADB device list:');
    try {
      const { stdout } = await execAsync('adb devices');
      console.log(stdout);
    } catch (error) {
      console.log('Could not list devices');
    }
  } else {
    console.log('❌ No IPs to check');
  }
}

// Run the scanner
console.log('======================================');
console.log('    ADB Network Scanner v1.0');
console.log('======================================\n');

scanAndConnect()
  .then(() => {
    console.log('\n✨ Scan complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });