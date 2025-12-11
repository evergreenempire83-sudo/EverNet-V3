// Add these imports:
import { fetchYouTubeVideoData } from '../../services/api/youtube';
import { runTransaction } from 'firebase/firestore';

// Replace handleAddVideo function:
const handleAddVideo = async (videoData) => {
  try {
    setAddingVideo(true);
    
    // Extract YouTube video ID
    const videoId = extractYouTubeId(videoData.youtubeUrl);
    if (!videoId) {
      toast.error('Invalid YouTube URL');
      return;
    }
    
    // 1. Fetch video data from YouTube API
    const youtubeData = await fetchYouTubeVideoData(videoId);
    if (!youtubeData) {
      toast.error('Could not fetch video data from YouTube');
      return;
    }
    
    // 2. Validate video ownership (simplified check)
    // In production, you'd verify channel ID matches creator's channel
    const isOwner = await validateVideoOwnership(videoId, currentUser.uid);
    if (!isOwner) {
      toast.error('You must own this YouTube video to add it');
      return;
    }
    
    // 3. Check if video already exists in system
    const existingVideo = await getDoc(doc(db, 'scanned_videos', videoId));
    if (existingVideo.exists()) {
      toast.error('This video is already in the system');
      return;
    }
    
    // 4. Create video document with transaction
    await runTransaction(db, async (transaction) => {
      // Create video document
      const videoRef = doc(db, 'scanned_videos', videoId);
      transaction.set(videoRef, {
        videoId,
        youtubeUrl: `https://youtube.com/watch?v=${videoId}`,
        creatorId: currentUser.uid,
        title: youtubeData.title,
        totalYouTubeViews: youtubeData.viewCount,
        totalEverNetViews: 0,
        totalPremiumViews: 0,
        currentMonthEarnings: 0,
        totalEarnings: 0,
        premiumPercentage: videoData.premiumPercentage || 7,
        scanFrequency: videoData.scanFrequency || 'daily',
        isActive: true,
        lastScanned: new Date(),
        addedAt: new Date(),
        updatedAt: new Date()
      });
      
      // Update user's video count
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists()) {
        const currentCount = userDoc.data().totalVideos || 0;
        transaction.update(userRef, {
          totalVideos: currentCount + 1,
          updatedAt: new Date()
        });
      }
    });
    
    toast.success('Video added successfully');
    setAddVideoOpen(false);
    fetchVideos();
  } catch (error) {
    console.error('Error adding video:', error);
    toast.error(`Failed to add video: ${error.message}`);
  } finally {
    setAddingVideo(false);
  }
};

// Add helper functions:
const extractYouTubeId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const validateVideoOwnership = async (videoId, creatorId) => {
  // Simplified - in production, you'd:
  // 1. Get creator's YouTube channel ID from their profile
  // 2. Check if video belongs to that channel via YouTube API
  // 3. Return true/false
  
  // For now, return true (implement proper validation later)
  return true;
};
