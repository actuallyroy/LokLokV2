const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create log file path - using a fixed name for easy access
const logFile = path.join(logsDir, 'metro.log');

// Clear the log file on startup
fs.writeFileSync(logFile, '', 'utf8');

// Strip ANSI escape codes from text
function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

// Intercept process.stdout and process.stderr to capture ALL output,
// including device logs that Expo CLI writes directly to stdout
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

function appendToLog(chunk) {
  const text = stripAnsi(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
  if (!text.trim()) return;
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logFile, `[${timestamp}] ${text}${text.endsWith('\n') ? '' : '\n'}`, 'utf8');
  } catch (error) {
    // ignore write errors
  }
}

process.stdout.write = function(chunk, encoding, callback) {
  appendToLog(chunk);
  return originalStdoutWrite(chunk, encoding, callback);
};

process.stderr.write = function(chunk, encoding, callback) {
  appendToLog(chunk);
  return originalStderrWrite(chunk, encoding, callback);
};

originalStdoutWrite('Metro bundler started - logging to ' + logFile + '\n');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [],
  resolver: {
    // Prefer React Native / browser entry points when available
    resolverMainFields: ['react-native', 'browser', 'main'],
    // Enable package exports + react-native condition
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['react-native', 'browser', 'default'],
    // Force axios node build to browser build (avoids Node core deps like `crypto`)
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'axios/dist/node/axios.cjs') {
        return {
          filePath: path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
          type: 'sourceFile',
        };
      }
      if (moduleName === 'axios') {
        return resolve(context, moduleName, platform);
      }
      return resolve(context, moduleName, platform);
    },
    blockList: [
      // Ignore CMake build directories to prevent Metro watcher errors
      /.*\/\.cxx\/.*/,
      /.*\/CMakeFiles\/.*/,
      /.*\/CMakeTmp\/.*/,
    ],
  },
};

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  watchFolders: config.watchFolders,
  resolver: {
    ...defaultConfig.resolver,
    ...config.resolver,
    blockList: config.resolver.blockList,
  },
};
