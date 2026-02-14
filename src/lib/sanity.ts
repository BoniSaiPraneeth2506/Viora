import {createClient} from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
  SANITY_TOKEN,
} from '@env';

// Read client for queries
export const sanityClient = createClient({
  projectId: SANITY_PROJECT_ID || 'your-project-id',
  dataset: SANITY_DATASET || 'production',
  apiVersion: SANITY_API_VERSION || '2024-01-01',
  useCdn: false, // Don't use CDN for real-time features
  token: SANITY_TOKEN,
});

// Write client for mutations (re-exported from write-client.ts)
export {sanityWriteClient} from './write-client';

// Image URL builder
const builder = imageUrlBuilder(sanityClient);

// Resolve image URLs, especially Google Images redirect URLs
const resolveImageUrl = (url?: string): string => {
  if (!url) return '';

  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Check if it's a Google Images redirect URL
    if (parsedUrl.hostname === 'www.google.com' && parsedUrl.pathname === '/imgres') {
      // Extract the actual image URL from the imgurl parameter
      const imageUrl = parsedUrl.searchParams.get('imgurl');
      return imageUrl ? decodeURIComponent(imageUrl) : '';
    }
    
    // Return the URL as-is for all other cases
    return url;
  } catch (error) {
    // If URL parsing fails, return the original string
    return url;
  }
};

export const urlFor = (source: any) => {
  // Handle null/undefined
  if (!source) {
    return {
      url: () => '',
      width: (w: number) => ({url: () => ''}),
      height: (h: number) => ({url: () => ''}),
      fit: (mode: string) => ({url: () => ''}),
      auto: (mode: string) => ({url: () => ''}),
    };
  }
  
  // If source is already a string URL, resolve it and return
  if (typeof source === 'string') {
    const resolvedUrl = resolveImageUrl(source);
    return {
      url: () => resolvedUrl,
      width: (w: number) => ({url: () => resolvedUrl}),
      height: (h: number) => ({url: () => resolvedUrl}),
      fit: (mode: string) => ({url: () => resolvedUrl}),
      auto: (mode: string) => ({url: () => resolvedUrl}),
    };
  }
  
  // If source is a Sanity image reference, use the builder
  return builder.image(source);
};

// Date formatting utility
export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Relative time formatting
export const formatRelativeTime = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }

  return 'just now';
};

// Format number with k/m suffix
export const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// Check if user has upvoted
export const hasUserUpvoted = (
  upvotedBy: Array<{_ref: string}> | undefined,
  userId: string,
): boolean => {
  if (!upvotedBy || !userId) return false;
  return upvotedBy.some(ref => ref._ref === userId);
};

// Check if user has saved/bookmarked
export const hasUserSaved = (
  savedItems: Array<{_ref: string}> | undefined,
  itemId: string,
): boolean => {
  if (!savedItems || !itemId) return false;
  return savedItems.some(ref => ref._ref === itemId);
};

// Check if user is following
export const isUserFollowing = (
  following: Array<{_ref: string}> | undefined,
  targetUserId: string,
): boolean => {
  if (!following || !targetUserId) return false;
  return following.some(ref => ref._ref === targetUserId);
};

// Get week ago date for trending queries
export const getWeekAgoDate = (): string => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return weekAgo.toISOString();
};
