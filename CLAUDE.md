# LokLok Project Instructions

## Screenshot Tool
When asked to "take a screenshot", "check my screen", or view the device screen, use:
```bash
python "D:\MyWorks\VSCode\React Native\LokLok\python\adb_screenshot.py"
```
This captures the Android device screen via ADB and saves it to the `screenshots/` folder.

## Project Overview
LokLok is a React Native (Expo) app for couples/friends to draw on each other's lockscreens.

## Key Commands
- `npx expo start` - Start Metro bundler
- `npx expo run:android` - Build and run on Android
- `npx expo prebuild` - Generate native code

## Firebase Project
- Project ID: `loklokv2-9e1ca`
- Config in: `src/services/firebase.ts`
