import {sanityClient} from './sanity';
import {
  toggleStartupUpvote,
  toggleStartupBookmark,
  toggleReelUpvote,
  toggleReelBookmark,
  toggleFollow,
  updateStartupViews,
  updateReelViews,
  createComment,
  toggleCommentUpvote,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './write-client';
import {
  Author,
  Startup,
  Reel,
  Comment,
  AuthorStats,
  AuthorReelsStats,
} from '../types';
import {
  AUTHOR_BY_ID_QUERY,
  STARTUP_BY_ID_QUERY,
  REEL_BY_ID_QUERY,
  AUTHOR_STATS_QUERY,
  AUTHOR_REELS_STATS_QUERY,
  UPVOTED_STARTUPS_BY_AUTHOR_QUERY,
  SAVED_STARTUPS_BY_AUTHOR_QUERY,
  UPVOTED_REELS_BY_AUTHOR_QUERY,
  SAVED_REELS_BY_AUTHOR_QUERY,
  COMMENTS_BY_STARTUP_QUERY,
  COMMENTS_BY_REEL_QUERY,
  NOTIFICATIONS_BY_USER_QUERY,
  UNREAD_NOTIFICATION_COUNT_QUERY,
} from './queries';

// ============================================
// INTERACTION HOOKS/UTILITIES
// ============================================

/**
 * Toggle upvote on a startup
 * Returns updated startup data
 */
export const handleStartupUpvote = async (
  startupId: string,
  userId: string,
  currentUpvotes: Array<{_ref: string}> | undefined,
): Promise<Startup | null> => {
  try {
    const isUpvoted = currentUpvotes?.some(u => u._ref === userId) || false;
    await toggleStartupUpvote(startupId, userId, isUpvoted);
    
    // Fetch updated startup
    const updatedStartup = await sanityClient.fetch<Startup>(
      STARTUP_BY_ID_QUERY,
      {id: startupId, userId: userId},
    );
    return updatedStartup;
  } catch (error) {
    console.error('Error toggling startup upvote:', error);
    return null;
  }
};

/**
 * Toggle bookmark on a startup
 * Returns updated author data
 */
export const handleStartupBookmark = async (
  startupId: string,
  userId: string,
  currentSaved: Array<{_ref: string}> | undefined,
): Promise<Author | null> => {
  try {
    const isSaved = currentSaved?.some(s => s._ref === startupId) || false;
    await toggleStartupBookmark(startupId, userId, isSaved);
    
    // Fetch updated author
    const updatedAuthor = await sanityClient.fetch<Author>(
      AUTHOR_BY_ID_QUERY,
      {id: userId},
    );
    return updatedAuthor;
  } catch (error) {
    console.error('Error toggling startup bookmark:', error);
    return null;
  }
};

/**
 * Toggle upvote on a reel
 * Returns updated reel data
 */
export const handleReelUpvote = async (
  reelId: string,
  userId: string,
  currentUpvotes: Array<{_ref: string}> | undefined,
): Promise<Reel | null> => {
  try {
    const isUpvoted = currentUpvotes?.some(u => u._ref === userId) || false;
    await toggleReelUpvote(reelId, userId, isUpvoted);
    
    // Fetch updated reel with user context
    const updatedReel = await sanityClient.fetch<Reel>(REEL_BY_ID_QUERY, {
      id: reelId,
      userId: userId,
    });
    return updatedReel;
  } catch (error) {
    console.error('Error toggling reel upvote:', error);
    return null;
  }
};

/**
 * Toggle bookmark on a reel
 * Returns updated author data
 */
export const handleReelBookmark = async (
  reelId: string,
  userId: string,
  currentSaved: Array<{_ref: string}> | undefined,
): Promise<Author | null> => {
  try {
    const isSaved = currentSaved?.some(s => s._ref === reelId) || false;
    console.log('🔖 handleReelBookmark:', {reelId, userId, isSaved, currentSavedCount: currentSaved?.length || 0});
    
    await toggleReelBookmark(reelId, userId, isSaved);
    
    // Fetch updated author with fresh savedReels
    console.log('🔄 Fetching updated author data...');
    const updatedAuthor = await sanityClient.fetch<Author>(
      AUTHOR_BY_ID_QUERY,
      {id: userId},
    );
    console.log('✅ Updated author savedReels:', updatedAuthor?.savedReels?.map(r => r._ref));
    return updatedAuthor;
  } catch (error) {
    console.error('❌ Error toggling reel bookmark:', error);
    return null;
  }
};

/**
 * Toggle follow on a user
 * Returns updated follower author data
 */
export const handleFollowToggle = async (
  followerId: string,
  targetUserId: string,
  currentFollowing: Array<{_ref: string}> | undefined,
): Promise<Author | null> => {
  try {
    const isFollowing =
      currentFollowing?.some(f => f._ref === targetUserId) || false;
    await toggleFollow(followerId, targetUserId, isFollowing);
    
    // Fetch updated author
    const updatedAuthor = await sanityClient.fetch<Author>(
      AUTHOR_BY_ID_QUERY,
      {id: followerId},
    );
    return updatedAuthor;
  } catch (error) {
    console.error('Error toggling follow:', error);
    return null;
  }
};

/**
 * Increment view count for a startup (unique per user)
 */
export const trackStartupView = async (startupId: string, userId?: string): Promise<void> => {
  try {
    await updateStartupViews(startupId, userId);
  } catch (error) {
    console.error('Error tracking startup view:', error);
  }
};

/**
 * Increment view count for a reel (unique per user)
 */
export const trackReelView = async (reelId: string, userId?: string): Promise<void> => {
  try {
    await updateReelViews(reelId, userId);
  } catch (error) {
    console.error('Error tracking reel view:', error);
  }
};

/**
 * Add a comment to a startup or reel
 */
export const handleAddComment = async (
  content: string,
  authorId: string,
  startupId?: string,
  reelId?: string,
  parentCommentId?: string,
): Promise<Comment | null> => {
  try {
    const comment = await createComment({
      content,
      authorId,
      startupId,
      reelId,
      parentCommentId,
    });
    return comment as unknown as Comment;
  } catch (error) {
    console.error('Error adding comment:', error);
    return null;
  }
};

/**
 * Toggle upvote on a comment
 */
export const handleCommentUpvote = async (
  commentId: string,
  userId: string,
  currentUpvotes: Array<{_ref: string}> | undefined,
): Promise<boolean> => {
  try {
    const isUpvoted = currentUpvotes?.some(u => u._ref === userId) || false;
    await toggleCommentUpvote(commentId, userId, isUpvoted);
    return true;
  } catch (error) {
    console.error('Error toggling comment upvote:', error);
    return false;
  }
};

/**
 * Fetch comments for a startup
 */
export const fetchStartupComments = async (
  startupId: string,
): Promise<Comment[]> => {
  try {
    const comments = await sanityClient.fetch<Comment[]>(
      COMMENTS_BY_STARTUP_QUERY,
      {startupId},
    );
    return comments;
  } catch (error) {
    console.error('Error fetching startup comments:', error);
    return [];
  }
};

/**
 * Fetch comments for a reel
 */
export const fetchReelComments = async (reelId: string): Promise<Comment[]> => {
  try {
    const comments = await sanityClient.fetch<Comment[]>(
      COMMENTS_BY_REEL_QUERY,
      {reelId},
    );
    return comments;
  } catch (error) {
    console.error('Error fetching reel comments:', error);
    return [];
  }
};

/**
 * Fetch author stats
 */
export const fetchAuthorStats = async (
  authorId: string,
): Promise<AuthorStats | null> => {
  try {
    const stats = await sanityClient.fetch<AuthorStats>(AUTHOR_STATS_QUERY, {
      id: authorId,
    });
    return stats;
  } catch (error) {
    console.error('Error fetching author stats:', error);
    return null;
  }
};

/**
 * Fetch author reels stats
 */
export const fetchAuthorReelsStats = async (
  authorId: string,
): Promise<AuthorReelsStats | null> => {
  try {
    const stats = await sanityClient.fetch<AuthorReelsStats>(
      AUTHOR_REELS_STATS_QUERY,
      {id: authorId},
    );
    return stats;
  } catch (error) {
    console.error('Error fetching author reels stats:', error);
    return null;
  }
};

/**
 * Fetch saved startups for a user
 */
export const fetchSavedStartups = async (
  userId: string,
): Promise<Startup[]> => {
  try {
    const startups = await sanityClient.fetch<Startup[]>(
      SAVED_STARTUPS_BY_AUTHOR_QUERY,
      {id: userId},
    );
    return startups.filter(s => s !== null);
  } catch (error) {
    console.error('Error fetching saved startups:', error);
    return [];
  }
};

/**
 * Fetch upvoted startups for a user
 */
export const fetchUpvotedStartups = async (
  userId: string,
): Promise<Startup[]> => {
  try {
    const startups = await sanityClient.fetch<Startup[]>(
      UPVOTED_STARTUPS_BY_AUTHOR_QUERY,
      {id: userId},
    );
    return startups.filter(s => s !== null);
  } catch (error) {
    console.error('Error fetching upvoted startups:', error);
    return [];
  }
};

/**
 * Fetch saved reels for a user
 */
export const fetchSavedReels = async (userId: string): Promise<Reel[]> => {
  try {
    const reels = await sanityClient.fetch<Reel[]>(
      SAVED_REELS_BY_AUTHOR_QUERY,
      {id: userId},
    );
    return reels.filter(r => r !== null);
  } catch (error) {
    console.error('Error fetching saved reels:', error);
    return [];
  }
};

/**
 * Fetch upvoted reels for a user
 */
export const fetchUpvotedReels = async (userId: string): Promise<Reel[]> => {
  try {
    const reels = await sanityClient.fetch<Reel[]>(
      UPVOTED_REELS_BY_AUTHOR_QUERY,
      {id: userId},
    );
    return reels.filter(r => r !== null);
  } catch (error) {
    console.error('Error fetching upvoted reels:', error);
    return [];
  }
};

/**
 * Mark a notification as read
 */
export const handleMarkNotificationRead = async (
  notificationId: string,
): Promise<boolean> => {
  try {
    await markNotificationAsRead(notificationId);
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read
 */
export const handleMarkAllNotificationsRead = async (
  userId: string,
): Promise<boolean> => {
  try {
    await markAllNotificationsAsRead(userId);
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Fetch unread notification count
 */
export const fetchUnreadNotificationCount = async (
  userId: string,
): Promise<number> => {
  try {
    const count = await sanityClient.fetch<number>(
      UNREAD_NOTIFICATION_COUNT_QUERY,
      {userId},
    );
    return count;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }
};
