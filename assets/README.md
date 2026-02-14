# Assets Folder

This folder contains app icon and splash screen assets needed for Expo.

## Required Assets

Create the following images and place them in this folder:

1. **icon.png** (1024x1024)
   - App icon for iOS and Android
   - Should be a square image
   
2. **splash.png** (1284x2778)
   - Splash screen image
   - Vertical image for app loading screen
   
3. **adaptive-icon.png** (1024x1024)
   - Android adaptive icon
   - Square image with transparent background
   
4. **favicon.png** (48x48)
   - Web favicon (for Expo web)

## Quick Setup

For testing, you can use placeholder images or run without them (Expo will show warnings but still work).

To generate default assets:
```bash
npx expo prebuild
```

Or upload your own branded images matching the dimensions above.
