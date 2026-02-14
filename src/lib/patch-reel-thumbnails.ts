/**
 * Utility to patch existing reels without thumbnails
 * Run this once to update all existing reels with auto-generated thumbnails
 */

import {sanityClient} from './sanity';
import {sanityWriteClient} from './write-client';

interface ReelWithoutThumbnail {
  _id: string;
  title: string;
  videoUrl: string;
  thumbnail?: string;
}

/**
 * Generate thumbnail URL from video URL (Cloudinary support)
 */
const generateThumbnailUrl = (videoUrl: string): string => {
  if (!videoUrl) return videoUrl;
  
  // Cloudinary: Extract first frame as thumbnail
  if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/upload/')) {
    const thumbnailUrl = videoUrl.replace(
      '/upload/',
      '/upload/so_0.0,w_400,h_711,c_fill/'
    );
    return thumbnailUrl;
  }
  
  // Alternative Cloudinary format
  if (videoUrl.includes('res.cloudinary.com') && videoUrl.includes('/video/upload/')) {
    const thumbnailUrl = videoUrl.replace(
      '/video/upload/',
      '/video/upload/so_0.0,w_400,h_711,c_fill/'
    );
    return thumbnailUrl;
  }
  
  // For non-Cloudinary, use video URL as-is
  return videoUrl;
};

/**
 * Fetch all reels without thumbnails
 */
export const getReelsWithoutThumbnails = async (): Promise<ReelWithoutThumbnail[]> => {
  const query = `*[_type == "reel" && !defined(thumbnail)] {
    _id,
    title,
    videoUrl,
    thumbnail
  }`;
  
  const reels = await sanityClient.fetch<ReelWithoutThumbnail[]>(query);
  console.log(`📹 Found ${reels.length} reels without thumbnails`);
  return reels;
};

/**
 * Patch a single reel with thumbnail
 */
export const patchReelThumbnail = async (
  reelId: string,
  videoUrl: string
): Promise<boolean> => {
  try {
    const thumbnailUrl = generateThumbnailUrl(videoUrl);
    
    console.log(`📸 Patching reel ${reelId} with thumbnail: ${thumbnailUrl}`);
    
    await sanityWriteClient
      .patch(reelId)
      .set({thumbnail: thumbnailUrl})
      .commit();
    
    console.log(`✅ Successfully patched reel ${reelId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to patch reel ${reelId}:`, error);
    return false;
  }
};

/**
 * Patch all reels without thumbnails
 */
export const patchAllReelThumbnails = async (): Promise<{
  total: number;
  success: number;
  failed: number;
}> => {
  console.log('🔧 Starting to patch all reels without thumbnails...');
  
  const reels = await getReelsWithoutThumbnails();
  
  let success = 0;
  let failed = 0;
  
  for (const reel of reels) {
    if (!reel.videoUrl) {
      console.warn(`⚠️ Reel ${reel._id} has no videoUrl, skipping...`);
      failed++;
      continue;
    }
    
    const result = await patchReelThumbnail(reel._id, reel.videoUrl);
    
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 Patching complete!');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${reels.length}`);
  
  return {
    total: reels.length,
    success,
    failed,
  };
};

/**
 * Test function - patch a single reel by ID
 */
export const testPatchReel = async (reelId: string): Promise<void> => {
  console.log(`🧪 Testing patch for reel: ${reelId}`);
  
  const query = `*[_type == "reel" && _id == $reelId][0] {
    _id,
    title,
    videoUrl,
    thumbnail
  }`;
  
  const reel = await sanityClient.fetch<ReelWithoutThumbnail>(query, {reelId});
  
  if (!reel) {
    console.error('❌ Reel not found');
    return;
  }
  
  console.log('📹 Current reel data:', reel);
  
  if (!reel.videoUrl) {
    console.error('❌ Reel has no videoUrl');
    return;
  }
  
  const result = await patchReelThumbnail(reel._id, reel.videoUrl);
  
  if (result) {
    console.log('✅ Test successful! Fetching updated reel...');
    
    const updatedReel = await sanityClient.fetch<ReelWithoutThumbnail>(query, {reelId});
    console.log('🎉 Updated reel data:', updatedReel);
  }
};
