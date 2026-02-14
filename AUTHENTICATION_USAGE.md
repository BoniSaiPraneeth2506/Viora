# Authentication Integration for Sanity Features

This document explains how the email/password authentication system integrates with Sanity CMS for tracking user interactions (likes, saves, comments).

## ✅ Fixed Issues

### 1. **Asset Files Error**
- Removed references to missing icon/splash images from `app.json`
- App no longer requires image files to run
- You can add custom icons later by restoring the image paths

### 2. **Reel Upvote Error**
- Fixed `user.id` → `user._id` throughout ReelPlayer component
- The Sanity mutations now receive the correct user document ID
- Upvotes, bookmarks, and comments now work properly

### 3. **Image URL Resolution**
- Enhanced `urlFor()` function to handle null/undefined sources
- Added support for string URLs and Sanity asset references
- Prevents "Unable to resolve image URL" crashes

## 🔐 How Authentication Works

### User Object Structure
```typescript
interface Author {
  _id: string;        // Sanity document ID (e.g., "123abc")
  id: string;         // Same as _id (for compatibility)
  name: string;       // Display name
  username: string;   // Unique username
  email: string;      // Email address
  image: string;      // Profile picture URL
  
  // Interaction arrays (stored in Sanity)
  savedStartups?: Array<{_ref: string}>;
  upvotedStartups?: Array<{_ref: string}>;
  savedReels?: Array<{_ref: string}>;
  upvotedReels?: Array<{_ref: string}>;
  followers?: Array<{_ref: string}>;
  following?: Array<{_ref: string}>;
}
```

### Authentication Flow

#### Sign Up
```typescript
const handleSignUp = async () => {
  const success = await signUp(email, password, name, username);
  if (success) {
    // User is automatically logged in
    // user object is available via useAuth()
  }
};
```

#### Sign In
```typescript
const handleSignIn = async () => {
  const success = await signIn(email, password);
  if (success) {
    // User data loaded from Sanity
    // Includes all interaction arrays
  }
};
```

#### Using Current User
```typescript
const {user, isAuthenticated} = useAuth();

// Always use user._id for Sanity operations
if (user) {
  console.log('User ID:', user._id);
  console.log('User name:', user.name);
  console.log('Upvoted startups:', user.upvotedStartups);
}
```

## 📊 Tracking User Interactions

### Liked/Upvoted Content

#### Check if User Upvoted a Startup
```typescript
import {hasUserUpvoted} from '../lib/sanity';

const isUpvoted = hasUserUpvoted(startup.upvotedBy, user._id);
```

#### Query User's Upvoted Startups
```typescript
import {UPVOTED_STARTUPS_BY_AUTHOR_QUERY} from '../lib/queries';

const upvotedStartups = await sanityClient.fetch(
  UPVOTED_STARTUPS_BY_AUTHOR_QUERY,
  {authorId: user._id}
);
```

#### Query User's Upvoted Reels
```typescript
import {UPVOTED_REELS_BY_AUTHOR_QUERY} from '../lib/queries';

const upvotedReels = await sanityClient.fetch(
  UPVOTED_REELS_BY_AUTHOR_QUERY,
  {authorId: user._id}
);
```

### Saved/Bookmarked Content

#### Check if User Saved a Startup
```typescript
import {hasUserSaved} from '../lib/sanity';

const isSaved = hasUserSaved(user.savedStartups, startup._id);
```

#### Query User's Saved Startups
```typescript
import {SAVED_STARTUPS_BY_AUTHOR_QUERY} from '../lib/queries';

const savedStartups = await sanityClient.fetch(
  SAVED_STARTUPS_BY_AUTHOR_QUERY,
  {authorId: user._id}
);
```

#### Query User's Saved Reels
```typescript
import {SAVED_REELS_BY_AUTHOR_QUERY} from '../lib/queries';

const savedReels = await sanityClient.fetch(
  SAVED_REELS_BY_AUTHOR_QUERY,
  {authorId: user._id}
);
```

### Comments

#### Query Comments on a Startup
```typescript
import {COMMENTS_BY_STARTUP_QUERY} from '../lib/queries';

const comments = await sanityClient.fetch(
  COMMENTS_BY_STARTUP_QUERY,
  {startupId: startup._id}
);
```

#### Query Comments on a Reel
```typescript
import {COMMENTS_BY_REEL_QUERY} from '../lib/queries';

const comments = await sanityClient.fetch(
  COMMENTS_BY_REEL_QUERY,
  {reelId: reel._id}
);
```

#### Create a Comment
```typescript
import {createComment} from '../lib/write-client';

await createComment({
  content: "Great startup!",
  authorId: user._id,
  startupId: startup._id, // or reelId for reels
});
```

## 🎯 User-Aware Queries

### Fetch Startups with User Context
The queries automatically include `hasUpvoted` and `isSaved` fields when you provide `userId`:

```typescript
const startups = await sanityClient.fetch(
  STARTUPS_QUERY_PAGINATED,
  {
    offset: 0,
    limit: 12,
    search: null,
    userId: user?._id // Pass user ID for personalized data
  }
);

// Each startup will have:
startups[0].hasUpvoted // true/false
startups[0].isSaved    // true/false
```

### Fetch Reels with User Context
```typescript
const reels = await sanityClient.fetch(
  REELS_WITH_USER_QUERY,
  {
    userId: user?._id // Pass user ID
  }
);

// Each reel will have:
reels[0].hasUpvoted // true/false
reels[0].isSaved    // true/false
```

## 🔄 Interactive Components

### UpvoteButton
Automatically handles optimistic updates and Sanity mutations:

```typescript
<UpvoteButton
  startupId={startup._id}
  initialUpvotes={startup.upvotes || 0}
  upvotedBy={startup.upvotedBy}
  variant="default"
  size="medium"
/>
```

**Features:**
- Requires authentication (redirects to login if not logged in)
- Optimistic UI updates (instant feedback)
- Automatically reverts on error
- Updates both startup and user documents in Sanity

### BookmarkButton
Save/unsave content with optimistic updates:

```typescript
<BookmarkButton
  startupId={startup._id}
  variant="ghost"
  size="small"
  showLabel={true}
/>
```

**Features:**
- Authentication required
- Optimistic updates
- Updates user's savedStartups array
- Works for both startups and reels

### ReelPlayer
Integrated upvote, bookmark, and comment actions:

```typescript
<ReelPlayer
  reel={reel}
  isActive={index === currentIndex}
/>
```

**Features:**
- Real-time upvote counts
- Real-time comment counts
- Bookmark functionality
- Auto-plays when active

## 📝 Example: Building a User Profile Screen

```typescript
import React, {useEffect, useState} from 'react';
import {useAuth} from '../contexts/AuthContext';
import {sanityClient} from '../lib/sanity';
import {
  UPVOTED_STARTUPS_BY_AUTHOR_QUERY,
  SAVED_STARTUPS_BY_AUTHOR_QUERY,
  UPVOTED_REELS_BY_AUTHOR_QUERY,
  SAVED_REELS_BY_AUTHOR_QUERY,
} from '../lib/queries';

const ProfileScreen = () => {
  const {user} = useAuth();
  const [upvotedStartups, setUpvotedStartups] = useState([]);
  const [savedStartups, setSavedStartups] = useState([]);
  const [upvotedReels, setUpvotedReels] = useState([]);
  const [savedReels, setSavedReels] = useState([]);

  useEffect(() => {
    if (user) {
      fetchUserInteractions();
    }
  }, [user]);

  const fetchUserInteractions = async () => {
    const [upvoted, saved, upvotedR, savedR] = await Promise.all([
      sanityClient.fetch(UPVOTED_STARTUPS_BY_AUTHOR_QUERY, {
        authorId: user._id,
      }),
      sanityClient.fetch(SAVED_STARTUPS_BY_AUTHOR_QUERY, {
        authorId: user._id,
      }),
      sanityClient.fetch(UPVOTED_REELS_BY_AUTHOR_QUERY, {
        authorId: user._id,
      }),
      sanityClient.fetch(SAVED_REELS_BY_AUTHOR_QUERY, {
        authorId: user._id,
      }),
    ]);

    setUpvotedStartups(upvoted);
    setSavedStartups(saved);
    setUpvotedReels(upvotedR);
    setSavedReels(savedR);
  };

  return (
    <View>
      <Text>Upvoted Startups: {upvotedStartups.length}</Text>
      <Text>Saved Startups: {savedStartups.length}</Text>
      <Text>Upvoted Reels: {upvotedReels.length}</Text>
      <Text>Saved Reels: {savedReels.length}</Text>
      
      {/* Render lists... */}
    </View>
  );
};
```

## 🔍 Important Notes

### Always Use `user._id`
- ✅ `user._id` - Correct (Sanity document ID)
- ❌ `user.id` - May be undefined depending on data source

### Check Authentication
Always check if user is logged in before tracking interactions:
```typescript
if (!user) {
  navigation.navigate('Login');
  return;
}
```

### Optimistic Updates
The components use optimistic updates for better UX:
1. Update UI immediately
2. Call Sanity mutation
3. Revert if mutation fails
4. Re-fetch to get accurate data

### Error Handling
All interaction functions return `null` on error and log to console:
```typescript
const result = await handleStartupUpvote(startupId, user._id, upvotedBy);
if (!result) {
  // Handle error - optimistic update will be reverted
  console.error('Upvote failed');
}
```

## 🚀 Next Steps

1. **Test Authentication**: Sign up and sign in with different accounts
2. **Test Interactions**: Upvote, save, and comment on content
3. **Verify Persistence**: Check that interactions persist after logout/login
4. **Add Profile Screen**: Display user's liked and saved content
5. **Add Notifications**: Show when someone interacts with your content

All the queries, mutations, and utilities are ready to use! 🎉
