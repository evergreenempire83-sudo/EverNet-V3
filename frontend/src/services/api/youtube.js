import axios from 'axios';

const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY || 'AIzaSyASLlsaMOnRfcwFt_9FrBBfsAGFXgJAsOs';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

// Fetch video data from YouTube API
export const fetchYouTubeVideoData = async (videoId) => {
  try {
    const response = await axios.get(`${YOUTUBE_API_URL}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });
    
    if (response.data.items.length === 0) {
      throw new Error('Video not found');
    }
    
    const video = response.data.items[0];
    return {
      videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      thumbnail: video.snippet.thumbnails.medium.url,
      viewCount: parseInt(video.statistics.viewCount) || 0,
      likeCount: parseInt(video.statistics.likeCount) || 0,
      commentCount: parseInt(video.statistics.commentCount) || 0,
      duration: video.contentDetails.duration,
      tags: video.snippet.tags || []
    };
  } catch (error) {
    console.error('YouTube API Error:', error);
    throw error;
  }
};

// Fetch channel data
export const fetchYouTubeChannelData = async (channelId) => {
  try {
    const response = await axios.get(`${YOUTUBE_API_URL}/channels`, {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: YOUTUBE_API_KEY
      }
    });
    
    if (response.data.items.length === 0) {
      throw new Error('Channel not found');
    }
    
    const channel = response.data.items[0];
    return {
      channelId,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.default.url,
      subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
      videoCount: parseInt(channel.statistics.videoCount) || 0,
      viewCount: parseInt(channel.statistics.viewCount) || 0
    };
  } catch (error) {
    console.error('YouTube API Error:', error);
    throw error;
  }
};

// Validate video ownership
export const validateVideoOwnership = async (videoId, channelId) => {
  try {
    const videoData = await fetchYouTubeVideoData(videoId);
    return videoData.channelId === channelId;
  } catch (error) {
    console.error('Ownership validation error:', error);
    return false;
  }
};

// Extract video ID from URL
export const extractYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
    /youtube\.com\/live\/([^"&?\/\s]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};
