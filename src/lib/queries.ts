// GROQ Queries for Sanity - Enhanced with yc_directory patterns

// ============================================
// STARTUP QUERIES
// ============================================

// Paginated queries for infinite scroll (10-12 posts per page)
export const STARTUPS_QUERY_PAGINATED = `*[_type == "startup" && defined(slug.current) && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now()) && ($search == "" || title match "*" + $search + "*" || category match "*" + $search + "*" || author->name match "*" + $search + "*")] | order(_createdAt desc) [$offset...$limit] {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  pitch,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;

export const STARTUPS_BY_VIEWS_QUERY_PAGINATED = `*[_type == "startup" && defined(slug.current) && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now()) && ($search == "" || title match "*" + $search + "*" || category match "*" + $search + "*" || author->name match "*" + $search + "*")] | order(views desc) [$offset...$limit] {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;

export const STARTUPS_BY_UPVOTES_QUERY_PAGINATED = `*[_type == "startup" && defined(slug.current) && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now()) && ($search == "" || title match "*" + $search + "*" || category match "*" + $search + "*" || author->name match "*" + $search + "*")] | order(coalesce(upvotes, 0) desc) [$offset...$limit] {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;

export const STARTUPS_BY_TAG_QUERY_PAGINATED = `*[_type == "startup" && defined(slug.current) && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now()) && $tag in tags && ($search == "" || title match "*" + $search + "*" || category match "*" + $search + "*" || author->name match "*" + $search + "*")] | order(_createdAt desc) [$offset...$limit] {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;

export const STARTUPS_QUERY = `*[_type == "startup" && defined(slug.current) && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now()) && ($search == "" || title match "*" + $search + "*" || category match "*" + $search + "*" || author->name match "*" + $search + "*")] | order(_createdAt desc) {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  upvotes,
  upvotedBy,
  tags,
  pitch
}`;

export const STARTUPS_BY_VIEWS_QUERY = `*[_type == "startup" && defined(slug.current) && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now()) && ($search == "" || title match "*" + $search + "*" || category match "*" + $search + "*" || author->name match "*" + $search + "*")] | order(views desc) {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  upvotes,
  upvotedBy,
  tags
}`;

export const STARTUPS_BY_UPVOTES_QUERY = `*[_type == "startup" && defined(slug.current) && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now()) && ($search == "" || title match "*" + $search + "*" || category match "*" + $search + "*" || author->name match "*" + $search + "*")] | order(coalesce(upvotes, 0) desc) {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  upvotes,
  upvotedBy,
  tags
}`;

export const STARTUPS_TRENDING_QUERY = `*[_type == "startup" && defined(slug.current) && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now()) && _createdAt > $weekAgo && ($search == "" || title match "*" + $search + "*" || category match "*" + $search + "*" || author->name match "*" + $search + "*")] | order(views desc, upvotes desc) [$offset...$limit] {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;

export const STARTUPS_BY_TAG_QUERY = `*[_type == "startup" && defined(slug.current) && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now()) && $tag in tags && ($search == "" || title match "*" + $search + "*" || category match "*" + $search + "*" || author->name match "*" + $search + "*")] | order(_createdAt desc) {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  upvotes,
  upvotedBy,
  tags
}`;

export const STARTUP_BY_ID_QUERY = `*[_type == "startup" && _id == $id][0]{
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, username, image, bio
  }, 
  views,
  description,
  category,
  image,
  pitch,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  pitchVideo,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;

export const STARTUP_VIEWS_QUERY = `*[_type == "startup" && _id == $id][0]{
  _id, views
}`;

// ============================================
// AUTHOR QUERIES
// ============================================

export const AUTHOR_BY_GITHUB_ID_QUERY = `*[_type == "author" && id == $id][0]{
  _id,
  id,
  name,
  username,
  email,
  image,
  bio,
  savedStartups,
  upvotedStartups,
  savedReels,
  upvotedReels,
  followers,
  following
}`;

export const AUTHOR_BY_ID_QUERY = `*[_type == "author" && _id == $id][0]{
  _id,
  id,
  name,
  username,
  email,
  savedStartups,
  upvotedStartups,
  savedReels,
  upvotedReels,
  followers,
  following,
  image,
  bio
}`;

// ============================================
// PROFILE TAB QUERIES
// ============================================

// User's own startups
export const STARTUPS_BY_AUTHOR_QUERY = `*[_type == "startup" && author._ref == $id && (isDraft != true) && (!defined(scheduledFor) || scheduledFor <= now())] | order(_createdAt desc) {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, username, image, bio
  }, 
  views,
  description,
  category,
  image,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  pitch,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;

// User's upvoted startups
export const UPVOTED_STARTUPS_BY_AUTHOR_QUERY = `*[_type == "author" && _id == $id][0].upvotedStartups[]->{
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, username, image, bio
  }, 
  views,
  description,
  category,
  image,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  pitch,
  isDraft,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;

// User's saved startups
export const SAVED_STARTUPS_BY_AUTHOR_QUERY = `*[_type == "author" && _id == $id][0].savedStartups[]->{
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, username, image, bio
  }, 
  views,
  description,
  category,
  image,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  pitch,
  isDraft,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;

// User's own reels
export const REELS_BY_AUTHOR_QUERY = `*[_type == "reel" && author._ref == $id] | order(_createdAt desc) {
  _id, 
  title,
  description,
  video,
  videoUrl,
  thumbnail,
  slug,
  duration,
  _createdAt,
  author -> {
    _id, name, username, image, bio
  },
  "views": coalesce(views, 0),
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  "commentCount": coalesce(commentCount, 0),
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedReels[]._ref, false)
}`;

// Count of user's own posts (startups + reels)
export const USER_POSTS_COUNT_QUERY = `{
  "postsCount": count(*[_type == "startup" && author._ref == $id]),
  "reelsCount": count(*[_type == "reel" && author._ref == $id]),
  "totalCount": count(*[_type == "startup" && author._ref == $id]) + count(*[_type == "reel" && author._ref == $id])
}`;

// Follow/Unfollow queries
export const FOLLOWERS_QUERY = `*[_type == "author" && $userId in following[]._ref]{
  _id,
  name,
  username,
  image,
  bio
}`;

export const FOLLOWING_QUERY = `*[_type == "author" && _id == $userId][0].following[]->{
  _id,
  name,
  username,
  image,
  bio
}`;

export const CHECK_FOLLOW_STATUS_QUERY = `*[_type == "author" && _id == $currentUserId][0]{
  "isFollowing": $targetUserId in following[]._ref
}`;

// User's upvoted reels
export const UPVOTED_REELS_BY_AUTHOR_QUERY = `*[_type == "author" && _id == $id][0].upvotedReels[]->{
  _id, 
  title,
  description,
  video,
  videoUrl,
  thumbnail,
  slug,
  duration,
  _createdAt,
  author -> {
    _id, name, username, image, bio
  },
  "views": coalesce(views, 0),
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  "commentCount": coalesce(commentCount, 0),
  "hasUpvoted": true,
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedReels[]._ref, false)
}`;

// User's saved reels
export const SAVED_REELS_BY_AUTHOR_QUERY = `*[_type == "author" && _id == $id][0].savedReels[]->{
  _id, 
  title,
  description,
  video,
  videoUrl,
  thumbnail,
  slug,
  _createdAt,
  author -> {
    _id, name, username, image, bio
  },
  "views": coalesce(views, 0),
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  duration,
  "commentCount": coalesce(commentCount, 0),
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": true
}`;


export const FOLLOWERS_BY_AUTHOR_QUERY = `*[_type == "author" && _id == $id][0].followers[]-> {
  _id,
  name,
  username,
  image,
  bio
}`;

export const FOLLOWING_BY_AUTHOR_QUERY = `*[_type == "author" && _id == $id][0].following[]-> {
  _id,
  name,
  username,
  image,
  bio
}`;

// ============================================
// REEL QUERIES
// ============================================

export const REELS_QUERY = `*[_type == "reel"] | order(_createdAt desc) {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  videoUrl,
  thumbnail,
  duration,
  upvotes,
  upvotedBy,
  tags,
  commentCount
}`;

export const REELS_WITH_USER_QUERY = `*[_type == "reel"] | order(_createdAt desc) [0...10] {
  _id, 
  title, 
  _createdAt,
  slug,
  author -> {
    _id, 
    name, 
    username,
    image,
    "isFollowing": select($userId != null => $userId in followers[]._ref, false)
  }, 
  "views": coalesce(views, 0),
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  description,
  videoUrl,
  thumbnail,
  duration,
  "commentCount": coalesce(commentCount, 0),
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedReels[]._ref, false)
}`;

export const REELS_INFINITE_QUERY = `*[_type == "reel" && _createdAt < $lastCreatedAt] | order(_createdAt desc) [0...5] {
  _id, 
  title, 
  _createdAt,
  slug,
  author -> {
    _id, 
    name, 
    username,
    image,
    "isFollowing": select($userId != null => $userId in followers[]._ref, false)
  }, 
  "views": coalesce(views, 0),
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  description,
  videoUrl,
  thumbnail,
  duration,
  "commentCount": coalesce(commentCount, 0),
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedReels[]._ref, false)
}`;

export const REELS_QUERY_PAGINATED = `*[_type == "reel"] | order(_createdAt desc) [$offset...$limit] {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  videoUrl,
  thumbnail,
  duration,
  upvotes,
  upvotedBy,
  tags,
  commentCount
}`;

export const REEL_BY_ID_QUERY = `*[_type == "reel" && _id == $id][0] {
  _id,
  title,
  slug,
  _createdAt,
  author -> {
    _id,
    name,
    username,
    image,
    bio
  },
  views,
  description,
  videoUrl,
  thumbnail,
  duration,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  commentCount,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedReels[]._ref, false)
}`;

// ============================================
// COMMENT QUERIES
// ============================================

export const COMMENTS_BY_STARTUP_QUERY = `*[_type == "comment" && startup._ref == $startupId && !defined(parentComment)] | order(_createdAt desc) {
  _id,
  content,
  _createdAt,
  upvotes,
  upvotedBy,
  author -> {
    _id,
    name,
    username,
    image
  },
  "replies": *[_type == "comment" && parentComment._ref == ^._id] | order(_createdAt asc) {
    _id,
    content,
    _createdAt,
    upvotes,
    upvotedBy,
    author -> {
      _id,
      name,
      username,
      image
    }
  }
}`;

export const COMMENT_COUNT_QUERY = `count(*[_type == "comment" && startup._ref == $startupId])`;

export const COMMENTS_BY_REEL_QUERY = `*[_type == "comment" && reel._ref == $reelId && !defined(parentComment)] | order(_createdAt desc) {
  _id,
  content,
  _createdAt,
  upvotes,
  upvotedBy,
  author -> {
    _id,
    name,
    username,
    image
  },
  "replies": *[_type == "comment" && parentComment._ref == ^._id] | order(_createdAt asc) {
    _id,
    content,
    _createdAt,
    upvotes,
    upvotedBy,
    author -> {
      _id,
      name,
      username,
      image
    }
  }
}`;

// ============================================
// NOTIFICATION QUERIES
// ============================================

export const NOTIFICATIONS_BY_USER_QUERY = `*[_type == "notification" && recipient._ref == $userId] | order(_createdAt desc) [0...50] {
  _id,
  type,
  message,
  read,
  _createdAt,
  milestoneType,
  milestoneValue,
  sender -> {
    _id,
    name,
    username,
    image
  },
  startup -> {
    _id,
    title,
    slug,
    image
  },
  reel -> {
    _id,
    title,
    slug,
    thumbnail,
    videoUrl
  },
  comment -> {
    _id,
    content
  }
}`;

export const UNREAD_NOTIFICATION_COUNT_QUERY = `count(*[_type == "notification" && recipient._ref == $userId && read == false])`;

// ============================================
// STATS QUERIES
// ============================================

export const AUTHOR_STATS_QUERY = `*[_type == "author" && _id == $id][0]{
  _id,
  "totalPosts": count(*[_type == "startup" && author._ref == ^._id && coalesce(isDraft, false) == false]),
  "totalViews": coalesce(math::sum(*[_type == "startup" && author._ref == ^._id && coalesce(isDraft, false) == false].views), 0),
  "totalUpvotes": coalesce(math::sum(*[_type == "startup" && author._ref == ^._id && coalesce(isDraft, false) == false].upvotes), 0),
  "followerCount": count(coalesce(followers, [])),
  "followingCount": count(coalesce(following, []))
}`;

export const AUTHOR_GROWTH_QUERY = `*[_type == "startup" && author._ref == $id && coalesce(isDraft, false) == false] | order(_createdAt asc) {
  _createdAt,
  "views": coalesce(views, 0),
  "upvotes": coalesce(upvotes, 0),
  title
}`;

export const AUTHOR_REELS_STATS_QUERY = `*[_type == "author" && _id == $id][0]{
  _id,
  "totalReels": count(*[_type == "reel" && author._ref == ^._id]),
  "totalReelViews": coalesce(math::sum(*[_type == "reel" && author._ref == ^._id].views), 0),
  "totalReelUpvotes": coalesce(math::sum(*[_type == "reel" && author._ref == ^._id].upvotes), 0),
  "totalComments": coalesce(math::sum(*[_type == "reel" && author._ref == ^._id].commentCount), 0)
}`;

export const AUTHOR_REELS_GROWTH_QUERY = `*[_type == "reel" && author._ref == $id] | order(_createdAt asc) {
  _createdAt,
  "views": coalesce(views, 0),
  "upvotes": coalesce(upvotes, 0),
  title
}`;

// ============================================
// CHAT/MESSAGE QUERIES
// ============================================

export const CONVERSATIONS_BY_USER_QUERY = `*[_type == "conversation" && $userId in participants[]._ref] | order(lastMessageAt desc) {
  _id,
  participants[]-> {
    _id,
    name,
    image,
    username,
    bio
  },
  lastMessage-> {
    _id,
    content,
    image,
    createdAt,
    sender-> {
      _id,
      name
    },
    readBy[]-> {
      _id
    }
  },
  lastMessageAt,
  createdAt
}`;

export const CONVERSATION_BY_PARTICIPANTS_QUERY = `*[_type == "conversation" && $user1 in participants[]._ref && $user2 in participants[]._ref][0] {
  _id,
  participants[]-> {
    _id,
    name,
    image,
    username,
    bio
  },
  lastMessage-> {
    _id,
    content,
    image,
    createdAt,
    sender-> {
      _id,
      name
    }
  },
  lastMessageAt,
  createdAt
}`;

export const MESSAGES_BY_CONVERSATION_QUERY = `*[_type == "message" && conversation._ref == $conversationId] | order(createdAt asc) {
  _id,
  content,
  image,
  sender-> {
    _id,
    name,
    image,
    username
  },
  readBy[]-> {
    _id
  },
  createdAt
}`;

export const SEARCH_USERS_QUERY = `*[_type == "author" && (
  lower(name) match lower($search) || 
  lower(username) match lower($search) || 
  lower(email) match lower($search)
)] | order(name asc) {
  _id,
  name,
  image,
  username,
  bio
}`;

// ============================================
// PLAYLIST QUERIES
// ============================================

export const PLAYLIST_BY_SLUG_QUERY = `*[_type == "playlist" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  select[]->{_id, _createdAt, title, slug, views, description, category, image, pitch, isDraft, author->{_id, name, slug, image, bio}} | {
    _id,
    title,
    slug,
    "select": select[coalesce(isDraft, false) == false]
  }
}`;

// ============================================
// DRAFT QUERIES
// ============================================

export const DRAFTS_BY_AUTHOR_QUERY = `*[_type == "startup" && author._ref == $id && isDraft == true] | order(_createdAt desc) {
  _id,
  title,
  description,
  category,
  image,
  _createdAt,
  scheduledFor
}`;

// ============================================
// RELATED CONTENT QUERIES
// ============================================

// Related startups based on category and tags
export const RELATED_STARTUPS_QUERY = `*[_type == "startup" 
  && _id != $currentId 
  && defined(slug.current)
  && (isDraft != true)
  && (category == $category || count((tags[])[@ in $tags]) > 0)
] | order(count((tags[])[@ in $tags]) desc, _createdAt desc) [0...6] {
  _id, 
  title, 
  slug,
  _createdAt,
  author -> {
    _id, name, image, bio, username
  }, 
  views,
  description,
  category,
  image,
  "upvotes": coalesce(upvotes, 0),
  upvotedBy,
  tags,
  "hasUpvoted": select($userId != null => $userId in upvotedBy[]._ref, false),
  "isSaved": select($userId != null => $userId in *[_type == "author" && _id == $userId][0].savedStartups[]._ref, false)
}`;
