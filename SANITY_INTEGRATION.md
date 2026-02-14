# Sanity Integration Guide

## Overview

Viora uses Sanity CMS for backend data management, with comprehensive queries and mutations integrated from the yc_directory Next.js application. This guide explains how Sanity is set up, what queries are available, and how to use them.

## Architecture

### Client Setup

The app uses two Sanity clients:

1. **Read Client** (`sanityClient`) - For fetching data
   - Location: `src/lib/sanity.ts`
   - Uses CDN: No (for real-time data)
   - Purpose: Queries and reads

2. **Write Client** (`sanityWriteClient`) - For mutations
   - Location: `src/lib/write-client.ts`
   - Requires authentication token
   - Purpose: Creating, updating, and deleting data

## File Structure

```
src/
├── lib/
│   ├── sanity.ts          # Main client & utility functions
│   ├── write-client.ts    # Write client & mutation functions
│   ├── queries.ts         # All GROQ queries
│   └── interactions.ts    # High-level interaction handlers
├── types/
│   └── index.ts           # TypeScript types
```

## Available Queries

### Startup Queries

#### Basic Queries
- `STARTUPS_QUERY` - All startups (latest first)
- `STARTUPS_BY_VIEWS_QUERY` - Sorted by views
- `STARTUPS_BY_UPVOTES_QUERY` - Sorted by upvotes
- `STARTUPS_TRENDING_QUERY` - Trending startups (past week)
- `STARTUPS_BY_TAG_QUERY` - Filter by tag
- `STARTUP_BY_ID_QUERY` - Single startup details
- `STARTUP_VIEWS_QUERY` - Just views count

#### Paginated Queries (recommended for infinite scroll)
- `STARTUPS_QUERY_PAGINATED`
- `STARTUPS_BY_VIEWS_QUERY_PAGINATED`
- `STARTUPS_BY_UPVOTES_QUERY_PAGINATED`
- `STARTUPS_BY_TAG_QUERY_PAGINATED`

### Reel Queries

- `REELS_QUERY` - All reels
- `REELS_WITH_USER_QUERY` - Reels with user interaction data
- `REELS_INFINITE_QUERY` - For infinite scroll
- `REELS_QUERY_PAGINATED` - Paginated reels
- `REEL_BY_ID_QUERY` - Single reel details
- `REELS_BY_AUTHOR_QUERY` - Reels by specific author
- `UPVOTED_REELS_BY_AUTHOR_QUERY` - User's upvoted reels
- `SAVED_REELS_BY_AUTHOR_QUERY` - User's saved reels

### Author/User Queries

- `AUTHOR_BY_ID_QUERY` - Author profile
- `AUTHOR_BY_GITHUB_ID_QUERY` - Find author by GitHub ID
- `FOLLOWERS_BY_AUTHOR_QUERY` - Author's followers list
- `FOLLOWING_BY_AUTHOR_QUERY` - Users author follows
- `STARTUPS_BY_AUTHOR_QUERY` - Author's startups
- `UPVOTED_STARTUPS_BY_AUTHOR_QUERY` - Author's upvoted startups
- `SAVED_STARTUPS_BY_AUTHOR_QUERY` - Author's saved startups

### Statistics Queries

- `AUTHOR_STATS_QUERY` - Author statistics (posts, views, upvotes, followers)
- `AUTHOR_REELS_STATS_QUERY` - Reel-specific statistics
- `AUTHOR_GROWTH_QUERY` - Growth data over time
- `AUTHOR_REELS_GROWTH_QUERY` - Reel growth over time

### Comment Queries

- `COMMENTS_BY_STARTUP_QUERY` - All comments on a startup (with replies)
- `COMMENTS_BY_REEL_QUERY` - All comments on a reel (with replies)
- `COMMENT_COUNT_QUERY` - Count of comments

### Notification Queries

- `NOTIFICATIONS_BY_USER_QUERY` - User's notifications
- `UNREAD_NOTIFICATION_COUNT_QUERY` - Count of unread notifications

### Chat/Message Queries

- `CONVERSATIONS_BY_USER_QUERY` - User's conversations
- `CONVERSATION_BY_PARTICIPANTS_QUERY` - Find conversation between users
- `MESSAGES_BY_CONVERSATION_QUERY` - All messages in a conversation
- `SEARCH_USERS_QUERY` - Search for users

## Usage Examples

### Fetching Startups with Pagination

```typescript
import {sanityClient, getWeekAgoDate} from './lib/sanity';
import {STARTUPS_QUERY_PAGINATED} from './lib/queries';

const PAGE_SIZE = 12;

const fetchStartups = async (offset: number = 0, search?: string) => {
  const params = {
    offset,
    limit: offset + PAGE_SIZE,
    ...(search && {search}),
  };

  const startups = await sanityClient.fetch(
    STARTUPS_QUERY_PAGINATED,
    params
  );
  
  return startups;
};
```

### Fetching Reels with User Data

```typescript
import {sanityClient} from './lib/sanity';
import {REELS_WITH_USER_QUERY} from './lib/queries';

const fetchReelsWithUserData = async (userId?: string) => {
  const params = userId ? {userId} : {};
  const reels = await sanityClient.fetch(REELS_WITH_USER_QUERY, params);
  return reels;
};
```

### Using High-Level Interaction Functions

The `interactions.ts` file provides convenient functions for common operations:

```typescript
import {
  handleStartupUpvote,
  handleStartupBookmark,
  handleFollowToggle,
  trackStartupView,
  fetchStartupComments,
} from './lib/interactions';

// Toggle upvote
const updatedStartup = await handleStartupUpvote(
  startupId,
  userId,
  startup.upvotedBy
);

// Toggle bookmark
const updatedAuthor = await handleStartupBookmark(
  startupId,
  userId,
  author.savedStartups
);

// Follow/unfollow user
const updatedFollower = await handleFollowToggle(
  currentUserId,
  targetUserId,
  currentUser.following
);

// Track view (increment counter)
await trackStartupView(startupId);

// Fetch comments
const comments = await fetchStartupComments(startupId);
```

## Mutations

All mutation functions are in `src/lib/write-client.ts`:

### Startup Mutations
- `createStartup(data)` - Create new startup
- `updateStartupViews(startupId)` - Increment views
- `toggleStartupUpvote(startupId, userId, isUpvoted)` - Toggle upvote
- `toggleStartupBookmark(startupId, userId, isSaved)` - Toggle bookmark

### Reel Mutations
- `createReel(data)` - Create new reel
- `updateReelViews(reelId)` - Increment views
- `toggleReelUpvote(reelId, userId, isUpvoted)` - Toggle upvote
- `toggleReelBookmark(reelId, userId, isSaved)` - Toggle bookmark

### Comment Mutations
- `createComment(data)` - Add comment (supports replies)
- `toggleCommentUpvote(commentId, userId, isUpvoted)` - Toggle upvote

### Follow Mutations
- `toggleFollow(followerId, followingId, isFollowing)` - Follow/unfollow

### Notification Mutations
- `markNotificationAsRead(notificationId)` - Mark single notification
- `markAllNotificationsAsRead(userId)` - Mark all as read

### Message/Chat Mutations
- `createConversation(participantIds)` - Create conversation
- `createMessage(data)` - Send message
- `markMessageAsRead(messageId, userId)` - Mark message read

### User/Author Mutations
- `createAuthor(data)` - Create new author profile
- `updateAuthorProfile(userId, data)` - Update profile

## Utility Functions

Located in `src/lib/sanity.ts`:

```typescript
// Image URL builder
urlFor(imageSource)

// Date formatting
formatDate(dateString)           // "Jan 15, 2024"
formatRelativeTime(dateString)   // "2 hours ago"

// Number formatting
formatCount(1500)                // "1.5K"
formatCount(2500000)             // "2.5M"

// Check user interactions
hasUserUpvoted(upvotedBy, userId)
hasUserSaved(savedItems, itemId)
isUserFollowing(following, targetUserId)

// Get date for trending queries
getWeekAgoDate()                 // ISO string 7 days ago
```

## Data Types

All TypeScript types are defined in `src/types/index.ts`:

### Main Types
- `Author` - User profile
- `Startup` - Startup post
- `Reel` - Short video content
- `Comment` - Comment with replies support
- `Message` - Chat message
- `Conversation` - Chat conversation
- `Notification` - User notification

### Stats Types
- `AuthorStats` - Author statistics
- `AuthorReelsStats` - Reel-specific stats
- `GrowthData` - Growth over time data

### Helper Types
- `SortOption` - 'latest' | 'views' | 'upvotes' | 'trending'
- `PostType` - 'startup' | 'reel'
- `PaginationParams` - Pagination parameters

## Best Practices

### 1. Use Paginated Queries for Lists
Always use paginated queries (`_PAGINATED` suffix) for list views to improve performance.

### 2. Use Interaction Helpers
Prefer functions from `interactions.ts` over direct mutation calls - they handle fetching updated data automatically.

### 3. Track Views Efficiently
Track views when content is displayed, not on every render:

```typescript
useEffect(() => {
  if (isActive) {
    trackStartupView(startupId);
  }
}, [isActive, startupId]);
```

### 4. Handle Optimistic Updates
Update UI immediately, then sync with backend:

```typescript
// Optimistic update
setStartups(prev => 
  prev.map(s => s._id === id ? {...s, upvotes: s.upvotes + 1} : s)
);

// Backend sync
const updated = await handleStartupUpvote(id, userId, upvotedBy);
if (updated) {
  setStartups(prev => 
    prev.map(s => s._id === id ? updated : s)
  );
}
```

### 5. Cache User Data
Store user data in context to avoid repeated queries:

```typescript
const {user} = useAuth();
// user._id, user.savedStartups, user.upvotedStartups, etc.
```

## Environment Variables

Required in `.env`:

```env
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SANITY_API_VERSION=2024-01-01
SANITY_TOKEN=your-write-token
```

## Features Integrated from yc_directory

✅ **Pagination & Infinite Scroll** - Efficient data loading
✅ **Multiple Sort Options** - Latest, trending, views, upvotes
✅ **Upvoting System** - Complete upvote/downvote functionality
✅ **Bookmarking** - Save startups and reels
✅ **Comments with Replies** - Nested comment threads
✅ **Follow System** - Follow/unfollow users
✅ **View Tracking** - Automatic view counting
✅ **Real-time Interactions** - useCdn: false for fresh data
✅ **Tag Filtering** - Filter content by tags
✅ **Statistics & Analytics** - Comprehensive stats queries
✅ **Chat/Messaging** - Full messaging system
✅ **Notifications** - User notification system
✅ **Search** - Search startups and users
✅ **Draft System** - Schedule and draft posts

## Next Steps

1. Update components to use interaction helpers
2. Implement optimistic UI updates
3. Add error handling and retry logic
4. Set up real-time listeners for chat
5. Implement analytics tracking
6. Add offline support with local caching

## Support

For issues or questions about Sanity integration:
1. Check query syntax in `src/lib/queries.ts`
2. Verify environment variables are set
3. Review Sanity Studio schema
4. Check network requests in debugger
