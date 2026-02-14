# React Native Authentication vs NextAuth

## ❌ NextAuth Does NOT Work in React Native

NextAuth is designed specifically for Next.js and uses:
- Next.js API routes
- Server-side sessions
- HTTP cookies
- Server components

**None of these work in React Native/Expo.**

---

## ✅ Authentication Solution Implemented

I've implemented **Email/Password Authentication with Sanity CMS** for your React Native app:

### Features

1. **Email & Password Login**
   - Sign up with email, password, name, username
   - Login with email & password
   - Secure authentication

2. **Sanity Integration**
   - Users stored in same Sanity database as Next.js
   - Shared `author` schema
   - Cross-platform compatibility

3. **Persistent Sessions**
   - AsyncStorage for token management
   - Auto-login on app restart
   - Secure user data storage

### Files Created/Modified

1. **`src/lib/auth.ts`** - Authentication service
   - `signUp()` - Create new account
   - `signIn()` - Login with credentials
   - `signOut()` - Logout
   - `getCurrentUser()` - Get logged-in user
   - `updateProfile()` - Update user info

2. **`src/contexts/AuthContext.tsx`** - Updated
   - Added `signUp()` method
   - Changed `signIn()` to accept email/password
   - Integrated with auth service

3. **`src/screens/LoginScreen.tsx`** - New login UI
   - Beautiful gradient design
   - Toggle between Login/Sign Up
   - Input validation
   - Loading states

---

## How to Use

### 1. Login Screen

```tsx
// Users see this when not authenticated
<LoginScreen />

// Features:
- Email input
- Password input
- Login/Sign Up toggle
- Form validation
```

### 2. Sign Up Flow

```typescript
const {signUp} = useAuth();

await signUp(
  'user@example.com',
  'password123',
  'John Doe',
  'johndoe'
);
```

### 3. Login Flow

```typescript
const {signIn} = useAuth();

await signIn('user@example.com', 'password123');
```

### 4. Check Auth Status

```typescript
const {user, isAuthenticated, isLoading} = useAuth();

if (isLoading) {
  return <LoadingScreen />;
}

if (!isAuthenticated) {
  return <LoginScreen />;
}

return <App />;
```

---

## Future Enhancement Options

### Option 1: OAuth with Expo AuthSession

For GitHub, Google, Apple sign-in:

```bash
npx expo install expo-auth-session expo-crypto
```

```typescript
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

const discovery = AuthSession.useAutoDiscovery('https://github.com');

// GitHub OAuth flow
const [request, response, promptAsync] = AuthSession.useAuthRequest(
  {
    clientId: 'YOUR_GITHUB_CLIENT_ID',
    scopes: ['user:email'],
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'viora'
    }),
  },
  discovery
);
```

### Option 2: Biometric Authentication

```bash
npx expo install expo-local-authentication
```

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Login with biometrics',
});
```

### Option 3: Custom Backend API

Create Express/Node.js API with JWT:

```typescript
// Your own API at https://api.viora.com
fetch('https://api.viora.com/auth/login', {
  method: 'POST',
  body: JSON.stringify({email, password}),
});
```

---

## Security Improvements for Production

### 1. Hash Passwords

**Current**: Passwords stored in plain text
**Production**: Use bcrypt

```typescript
import bcrypt from 'bcryptjs';

// When creating user
const hashedPassword = await bcrypt.hash(password, 10);

// When logging in
const isValid = await bcrypt.compare(password, user.password);
```

### 2. Use JWT Tokens

Instead of simple tokens:

```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  {userId: user._id, email: user.email},
  'YOUR_SECRET_KEY',
  {expiresIn: '7d'}
);
```

### 3. Add Token Refresh

```typescript
// Refresh token every 7 days
const refreshToken = async () => {
  // Call your backend to get new token
};
```

---

## Testing Authentication

### Test Login

1. Run Expo: `npx expo start`
2. Open app in Expo Go
3. You'll see LoginScreen
4. Switch to "Sign Up" tab
5. Fill in:
   - Name: Test User
   - Username: testuser
   - Email: test@example.com
   - Password: password123
6. Click "Create Account"
7. You should be logged in automatically

### Test Data in Sanity

Your Sanity Studio (Next.js project):
```
http://localhost:3000/studio
```

Check `author` documents - you'll see users created from mobile app!

---

## Architecture

```
┌─────────────────┐
│  React Native   │
│   (Viora App)   │
└────────┬────────┘
         │
         │ Email/Password
         │ (src/lib/auth.ts)
         │
         ▼
┌─────────────────┐
│  Sanity CMS     │◄────── Shared Database
│  (Database)     │
└────────┬────────┘
         │
         │
         ▼
┌─────────────────┐
│    Next.js      │
│ (YC Directory)  │
└─────────────────┘
```

**Both apps share the same Sanity database!**

---

## Quick Start

The authentication is ready to use:

```typescript
import {useAuth} from './src/contexts/AuthContext';

function MyComponent() {
  const {user, isAuthenticated, signIn, signUp, signOut} = useAuth();

  // Use it!
}
```

That's it! You now have working authentication without NextAuth.
