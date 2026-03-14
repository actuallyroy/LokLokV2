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

// Create a function that writes immediately to file
function writeToLog(level, args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object') {
      return util.inspect(arg, { depth: null, colors: false });
    }
    return stripAnsi(String(arg));
  }).join(' ');

  // Skip empty lines after stripping ANSI codes
  if (!formattedArgs.trim()) {
    return;
  }

  const message = `[${timestamp}] [${level}] ${formattedArgs}\n`;

  // Use appendFileSync for immediate write
  try {
    fs.appendFileSync(logFile, message, 'utf8');
  } catch (error) {
    // If we can't write to the log file, at least show it in console
  }
}

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console)
};

// Override console methods
console.log = function(...args) {
  writeToLog('LOG', args);
  originalConsole.log(...args);
};

console.error = function(...args) {
  writeToLog('ERROR', args);
  originalConsole.error(...args);
};

console.warn = function(...args) {
  writeToLog('WARN', args);
  originalConsole.warn(...args);
};

console.info = function(...args) {
  writeToLog('INFO', args);
  originalConsole.info(...args);
};

console.debug = function(...args) {
  writeToLog('DEBUG', args);
  originalConsole.debug(...args);
};

// Log startup
console.log('Metro bundler started - logging to', logFile);

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
