import {createClient} from '@sanity/client';
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
  SANITY_TOKEN,
} from '@env';

// Write client for mutations (create, update, delete)
export const sanityWriteClient = createClient({
  projectId: SANITY_PROJECT_ID || 'your-project-id',
  dataset: SANITY_DATASET || 'production',
  apiVersion: SANITY_API_VERSION || '2024-01-01',
  useCdn: false,
  token: SANITY_TOKEN,
});

// ============================================
// STARTUP MUTATIONS
// ============================================

export const createStartup = async (data: {
  title: string;
  description: string;
  category: string;
  image?: string;
  pitch?: string;
  authorId: string;
  tags?: string[];
}) => {
  const doc = {
    _type: 'startup',
    title: data.title,
    description: data.description,
    category: data.category,
    image: data.image,
    pitch: data.pitch,
    author: {
      _type: 'reference',
      _ref: data.authorId,
    },
    tags: data.tags || [],
    views: 0,
    upvotes: 0,
    upvotedBy: [],
    isDraft: false,
    slug: {
      _type: 'slug',
      current: data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    },
  };

  return sanityWriteClient.create(doc);
};

export const updateStartupViews = async (startupId: string, userId?: string) => {
  // If userId provided, check if already viewed (unique view tracking like yc_directory)
  if (userId) {
    const startup = await sanityWriteClient.getDocument(startupId);
    const viewedBy = ((startup as any)?.viewedBy || []) as Array<{_ref: string}>;
    
    // Check if user already viewed
    const alreadyViewed = viewedBy.some((v: {_ref: string}) => v._ref === userId);
    
    if (alreadyViewed) {
      console.log('👁️ User already viewed this startup, skipping view increment');
      return startup;
    }
    
    // Add user to viewedBy and increment views
    console.log('✨ New unique view! Incrementing count');
    return sanityWriteClient
      .patch(startupId)
      .setIfMissing({views: 0, viewedBy: []})
      .inc({views: 1})
      .append('viewedBy', [{_type: 'reference', _ref: userId, _key: `view-${Date.now()}`}])
      .commit();
  }
  
  // Fallback: no userId provided (backward compatible)
  return sanityWriteClient
    .patch(startupId)
    .setIfMissing({views: 0})
    .inc({views: 1})
    .commit();
};

export const toggleStartupUpvote = async (
  startupId: string,
  userId: string,
  isUpvoted: boolean,
) => {
  if (isUpvoted) {
    // Remove upvote
    return Promise.all([
      sanityWriteClient
        .patch(startupId)
        .unset([`upvotedBy[_ref=="${userId}"]`])
        .dec({upvotes: 1})
        .commit(),
      sanityWriteClient
        .patch(userId)
        .unset([`upvotedStartups[_ref=="${startupId}"]`])
        .commit(),
    ]);
  } else {
    // Add upvote
    return Promise.all([
      sanityWriteClient
        .patch(startupId)
        .setIfMissing({upvotes: 0, upvotedBy: []})
        .inc({upvotes: 1})
        .append('upvotedBy', [{_type: 'reference', _ref: userId, _key: `upvote-${Date.now()}`}])
        .commit(),
      sanityWriteClient
        .patch(userId)
        .setIfMissing({upvotedStartups: []})
        .append('upvotedStartups', [{_type: 'reference', _ref: startupId, _key: `startup-${Date.now()}`}])
        .commit(),
    ]);
  }
};

export const toggleStartupBookmark = async (
  startupId: string,
  userId: string,
  isSaved: boolean,
) => {
  if (isSaved) {
    // Remove bookmark
    return sanityWriteClient
      .patch(userId)
      .unset([`savedStartups[_ref=="${startupId}"]`])
      .commit();
  } else {
    // Add bookmark
    return sanityWriteClient
      .patch(userId)
      .setIfMissing({savedStartups: []})
      .append('savedStartups', [{_type: 'reference', _ref: startupId, _key: `save-${Date.now()}`}])
      .commit();
  }
};

// ============================================
// REEL MUTATIONS
// ============================================

export const createReel = async (data: {
  title: string;
  description: string;
  videoUrl: string;
  thumbnail?: string;
  category?: string;
  authorId: string;
  tags?: string[];
  duration?: number;
}) => {
  // Generate thumbnail from video URL if not provided
  let thumbnailUrl = data.thumbnail || data.videoUrl;
  
  if (!data.thumbnail && data.videoUrl.includes('cloudinary.com')) {
    // Cloudinary: Extract first frame as thumbnail
    thumbnailUrl = data.videoUrl.replace('/upload/', '/upload/so_0.0,w_400,h_711,c_fill/');
    console.log('📸 Auto-generated Cloudinary thumbnail:', thumbnailUrl);
  }

  const doc = {
    _type: 'reel',
    title: data.title,
    description: data.description,
    videoUrl: data.videoUrl,
    thumbnail: thumbnailUrl, // Add thumbnail URL
    category: data.category,
    duration: data.duration,
    author: {
      _type: 'reference',
      _ref: data.authorId,
    },
    tags: data.tags || [],
    views: 0,
    upvotes: 0,
    upvotedBy: [],
    viewedBy: [], // Initialize viewedBy array for unique user tracking
    commentCount: 0,
    slug: {
      _type: 'slug',
      current: data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    },
  };

  return sanityWriteClient.create(doc);
};

export const updateReelViews = async (reelId: string, userId?: string) => {
  // If userId provided, check if already viewed (unique view tracking like yc_directory)
  if (userId) {
    const reel = await sanityWriteClient.getDocument(reelId);
    const viewedBy = ((reel as any)?.viewedBy || []) as Array<{_ref: string}>;
    
    // Check if user already viewed
    const alreadyViewed = viewedBy.some((v: {_ref: string}) => v._ref === userId);
    
    if (alreadyViewed) {
      console.log('👁️ User already viewed this reel, skipping view increment');
      return reel;
    }
    
    // Add user to viewedBy and increment views
    console.log('✨ New unique view! Incrementing count');
    return sanityWriteClient
      .patch(reelId)
      .setIfMissing({views: 0, viewedBy: []})
      .inc({views: 1})
      .append('viewedBy', [{_type: 'reference', _ref: userId, _key: `view-${Date.now()}`}])
      .commit();
  }
  
  // Fallback: no userId provided (backward compatible)
  return sanityWriteClient
    .patch(reelId)
    .setIfMissing({views: 0})
    .inc({views: 1})
    .commit();
};

export const toggleReelUpvote = async (
  reelId: string,
  userId: string,
  isUpvoted: boolean,
) => {
  if (isUpvoted) {
    // Remove upvote
    return Promise.all([
      sanityWriteClient
        .patch(reelId)
        .unset([`upvotedBy[_ref=="${userId}"]`])
        .dec({upvotes: 1})
        .commit(),
      sanityWriteClient
        .patch(userId)
        .unset([`upvotedReels[_ref=="${reelId}"]`])
        .commit(),
    ]);
  } else {
    // Add upvote
    return Promise.all([
      sanityWriteClient
        .patch(reelId)
        .setIfMissing({upvotes: 0, upvotedBy: []})
        .inc({upvotes: 1})
        .append('upvotedBy', [{_type: 'reference', _ref: userId, _key: `upvote-${Date.now()}`}])
        .commit(),
      sanityWriteClient
        .patch(userId)
        .setIfMissing({upvotedReels: []})
        .append('upvotedReels', [{_type: 'reference', _ref: reelId, _key: `reel-${Date.now()}`}])
        .commit(),
    ]);
  }
};

export const toggleReelBookmark = async (
  reelId: string,
  userId: string,
  isSaved: boolean,
) => {
  console.log('💾 toggleReelBookmark called:', {reelId, userId, isSaved});
  
  if (isSaved) {
    // Remove bookmark
    console.log('🗑️ Removing bookmark from savedReels');
    const result = await sanityWriteClient
      .patch(userId)
      .unset([`savedReels[_ref=="${reelId}"]`])
      .commit();
    console.log('✅ Bookmark removed successfully');
    return result;
  } else {
    // Add bookmark
    console.log('➕ Adding bookmark to savedReels');
    const result = await sanityWriteClient
      .patch(userId)
      .setIfMissing({savedReels: []})
      .append('savedReels', [{_type: 'reference', _ref: reelId, _key: `save-${Date.now()}`}])
      .commit();
    console.log('✅ Bookmark added successfully');
    return result;
  }
};

// ============================================
// COMMENT MUTATIONS
// ============================================

export const createComment = async (data: {
  content: string;
  authorId: string;
  startupId?: string;
  reelId?: string;
  parentCommentId?: string;
}) => {
  const doc: any = {
    _type: 'comment',
    content: data.content,
    author: {
      _type: 'reference',
      _ref: data.authorId,
    },
    upvotes: 0,
    upvotedBy: [],
  };

  if (data.startupId) {
    doc.startup = {
      _type: 'reference',
      _ref: data.startupId,
    };
  }

  if (data.reelId) {
    doc.reel = {
      _type: 'reference',
      _ref: data.reelId,
    };
    // Increment reel comment count
    await sanityWriteClient
      .patch(data.reelId)
      .setIfMissing({commentCount: 0})
      .inc({commentCount: 1})
      .commit();
  }

  if (data.parentCommentId) {
    doc.parentComment = {
      _type: 'reference',
      _ref: data.parentCommentId,
    };
  }

  return sanityWriteClient.create(doc);
};

export const toggleCommentUpvote = async (
  commentId: string,
  userId: string,
  isUpvoted: boolean,
) => {
  if (isUpvoted) {
    // Remove upvote
    return sanityWriteClient
      .patch(commentId)
      .unset([`upvotedBy[_ref=="${userId}"]`])
      .dec({upvotes: 1})
      .commit();
  } else {
    // Add upvote
    return sanityWriteClient
      .patch(commentId)
      .setIfMissing({upvotes: 0, upvotedBy: []})
      .inc({upvotes: 1})
      .append('upvotedBy', [{_type: 'reference', _ref: userId, _key: `upvote-${Date.now()}`}])
      .commit();
  }
};

// ============================================
// FOLLOW MUTATIONS
// ============================================

export const toggleFollow = async (
  followerId: string,
  followingId: string,
  isFollowing: boolean,
) => {
  if (isFollowing) {
    // Unfollow
    return Promise.all([
      sanityWriteClient
        .patch(followerId)
        .unset([`following[_ref=="${followingId}"]`])
        .commit(),
      sanityWriteClient
        .patch(followingId)
        .unset([`followers[_ref=="${followerId}"]`])
        .commit(),
    ]);
  } else {
    // Follow
    return Promise.all([
      sanityWriteClient
        .patch(followerId)
        .setIfMissing({following: []})
        .append('following', [{_type: 'reference', _ref: followingId, _key: `following-${Date.now()}`}])
        .commit(),
      sanityWriteClient
        .patch(followingId)
        .setIfMissing({followers: []})
        .append('followers', [{_type: 'reference', _ref: followerId, _key: `follower-${Date.now()}`}])
        .commit(),
    ]);
  }
};

// ============================================
// NOTIFICATION MUTATIONS
// ============================================

export const markNotificationAsRead = async (notificationId: string) => {
  return sanityWriteClient
    .patch(notificationId)
    .set({read: true})
    .commit();
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const notifications = await sanityWriteClient.fetch(
    `*[_type == "notification" && recipient._ref == $userId && read == false]._id`,
    {userId},
  );

  const transaction = sanityWriteClient.transaction();
  notifications.forEach((id: string) => {
    transaction.patch(id, {set: {read: true}});
  });

  return transaction.commit();
};

// ============================================
// MESSAGE/CHAT MUTATIONS
// ============================================

export const createConversation = async (participantIds: string[]) => {
  const doc = {
    _type: 'conversation',
    participants: participantIds.map(id => ({
      _type: 'reference',
      _ref: id,
    })),
    createdAt: new Date().toISOString(),
  };

  return sanityWriteClient.create(doc);
};

export const createMessage = async (data: {
  conversationId: string;
  senderId: string;
  content: string;
  image?: string;
}) => {
  const doc = {
    _type: 'message',
    conversation: {
      _type: 'reference',
      _ref: data.conversationId,
    },
    sender: {
      _type: 'reference',
      _ref: data.senderId,
    },
    content: data.content,
    image: data.image,
    readBy: [{_type: 'reference', _ref: data.senderId}],
    createdAt: new Date().toISOString(),
  };

  const message = await sanityWriteClient.create(doc);

  // Update conversation's last message
  await sanityWriteClient
    .patch(data.conversationId)
    .set({
      lastMessage: {_type: 'reference', _ref: message._id},
      lastMessageAt: doc.createdAt,
    })
    .commit();

  return message;
};

export const markMessageAsRead = async (messageId: string, userId: string) => {
  return sanityWriteClient
    .patch(messageId)
    .setIfMissing({readBy: []})
    .append('readBy', [{_type: 'reference', _ref: userId, _key: `read-${Date.now()}`}])
    .commit();
};

// ============================================
// USER/AUTHOR MUTATIONS
// ============================================

export const updateAuthorProfile = async (
  userId: string,
  data: {
    name?: string;
    username?: string;
    bio?: string;
    image?: string;
  },
) => {
  const updates: any = {};
  if (data.name) updates.name = data.name;
  if (data.username) updates.username = data.username;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.image) updates.image = data.image;

  return sanityWriteClient.patch(userId).set(updates).commit();
};

export const createAuthor = async (data: {
  id: string;
  name: string;
  username: string;
  email: string;
  image: string;
  bio?: string;
}) => {
  const doc = {
    _type: 'author',
    id: data.id,
    name: data.name,
    username: data.username,
    email: data.email,
    image: data.image,
    bio: data.bio || '',
    savedStartups: [],
    upvotedStartups: [],
    savedReels: [],
    upvotedReels: [],
    followers: [],
    following: [],
  };

  return sanityWriteClient.create(doc);
};
