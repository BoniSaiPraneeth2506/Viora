# 🚀 Quick Setup Guide for Viora

## Step 1: Get Your Sanity Credentials

Your Next.js project already has Sanity configured. Copy these values:

```bash
# From: c:\Users\saipr\web\nextjs\yc_directory\.env.local
# Or from sanity.config.ts
```

Look for:
- `SANITY_PROJECT_ID` (in sanity.config.ts)
- `SANITY_DATASET` (usually "production")
- `SANITY_TOKEN` (from Sanity dashboard)

## Step 2: Update .env File

Open `c:\Users\saipr\web\react_native\Viora\.env` and replace:

```env
SANITY_PROJECT_ID=your_project_id_here  # ← Replace this
SANITY_DATASET=production
SANITY_API_VERSION=2024-01-01
SANITY_TOKEN=your_sanity_token_here     # ← Replace this
```

## Step 3: Run the App

```bash
# Open terminal in Viora folder
cd c:\Users\saipr\web\react_native\Viora

# Start Metro
npm start

# In another terminal, run Android
npm run android
```

## Step 4: Test It

Once the app loads:
1. ✅ You should see the Login screen (Viora logo)
2. ✅ After login, you'll see the Home screen with startups from Sanity
3. ✅ Tap Reels tab to see videos
4. ✅ Tap Profile to see user profile
5. ✅ Test light/dark mode switching

## Common Issues & Solutions

### Issue: "Metro bundler not starting"
```bash
npm start -- --reset-cache
```

### Issue: "Android build failed"
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Issue: "Cannot connect to Sanity"
- Check your `.env` file has correct credentials
- Verify Sanity token has read permissions
- Check network connection

### Issue: "Module not found"
```bash
rm -rf node_modules
npm install --legacy-peer-deps
```

## Next Features to Implement

After the basic app is working, you can add:

1. **Real Chat** - Implement Socket.io messages
2. **Create Posts** - Add image/video upload
3. **Notifications** - Real-time notifications
4. **Social Features** - Like, comment, save functionality
5. **GitHub OAuth** - Complete OAuth flow

## File Structure Quick Reference

```
Key files you'll edit often:
├── .env                      # ← Start here (add credentials)
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx    # Main feed
│   │   ├── CreateScreen.tsx  # Create posts (implement)
│   │   └── MessagesScreen.tsx # Chat (implement)
│   ├── lib/
│   │   ├── sanity.ts         # Sanity config
│   │   └── queries.ts        # GROQ queries
│   └── constants/
│       └── theme.ts          # Colors, fonts, spacing
```

## Testing Checklist

- [ ] App builds and runs
- [ ] Can see startups from Sanity on Home screen
- [ ] Reels screen shows (even if no videos yet)
- [ ] Profile screen displays
- [ ] Bottom navigation works
- [ ] Light/Dark mode toggles
- [ ] Search bar appears on Home
- [ ] Can tap on startup cards

## Need Help?

1. Check `README.md` for full documentation
2. See `NEXTJS_TO_REACT_NATIVE_DOCUMENTATION.md` for UI specs
3. Review error logs in Metro bundler
4. Check Sanity dashboard for data issues

---

**You're all set! 🎉**

The hard part (setup) is done. Now just configure your `.env` and run the app!
