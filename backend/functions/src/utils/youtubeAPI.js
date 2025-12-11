const axios = require('axios');
const { YOUTUBE_API_KEY } = require('../../config/youtube.config');
const logger = require('./logger');

class YouTubeAPI {
  constructor() {
    this.apiKey = YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    this.axiosInstance = axios.create({
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get video details
   */
  async getVideoDetails(videoId) {
    try {
      const response = await this.axiosInstance.get(`${this.baseUrl}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails,status',
          id: videoId,
          key: this.apiKey
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      return this.parseVideoData(response.data.items[0]);
    } catch (error) {
      logger.error(`YouTube API Error for video ${videoId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get multiple video details at once
   */
  async getMultipleVideoDetails(videoIds) {
    try {
      // YouTube API allows max 50 IDs per request
      const batchSize = 50;
      const allVideos = [];

      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batchIds = videoIds.slice(i, i + batchSize);
        
        const response = await this.axiosInstance.get(`${this.baseUrl}/videos`, {
          params: {
            part: 'snippet,statistics',
            id: batchIds.join(','),
            key: this.apiKey
          }
        });

        if (response.data.items) {
          allVideos.push(...response.data.items.map(item => this.parseVideoData(item)));
        }

        // Delay to avoid rate limiting
        if (i + batchSize < videoIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allVideos;
    } catch (error) {
      logger.error('YouTube API Error for multiple videos:', error.message);
      throw error;
    }
  }

  /**
   * Search YouTube videos
   */
  async searchVideos(query, maxResults = 10) {
    try {
      const response = await this.axiosInstance.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: maxResults,
          key: this.apiKey
        }
      });

      if (!response.data.items) {
        return [];
      }

      // Get video details for each search result
      const videoIds = response.data.items.map(item => item.id.videoId);
      const videoDetails = await this.getMultipleVideoDetails(videoIds);

      // Combine search results with details
      return response.data.items.map((item, index) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        channelId: item.snippet.channelId,
        channelName: item.snippet.channelTitle,
        publishedAt: new Date(item.snippet.publishedAt),
        ...(videoDetails[index] || {})
      }));

    } catch (error) {
      logger.error('YouTube Search API Error:', error.message);
      throw error;
    }
  }

  /**
   * Get channel details
   */
  async getChannelDetails(channelId) {
    try {
      const response = await this.axiosInstance.get(`${this.baseUrl}/channels`, {
        params: {
          part: 'snippet,statistics',
          id: channelId,
          key: this.apiKey
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      const channel = response.data.items[0];
      return {
        channelId: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnail: channel.snippet.thumbnails.high?.url,
        customUrl: channel.snippet.customUrl,
        subscriberCount: parseInt(channel.statistics.subscriberCount || 0),
        videoCount: parseInt(channel.statistics.videoCount || 0),
        viewCount: parseInt(channel.statistics.viewCount || 0)
      };
    } catch (error) {
      logger.error(`YouTube Channel API Error for ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if video exists and is public
   */
  async verifyVideo(videoId) {
    try {
      const video = await this.getVideoDetails(videoId);
      
      if (!video) {
        return {
          exists: false,
          error: 'Video not found'
        };
      }

      if (video.privacyStatus !== 'public') {
        return {
          exists: true,
          isPublic: false,
          error: 'Video is not public'
        };
      }

      return {
        exists: true,
        isPublic: true,
        video: video
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Parse video data from YouTube API response
   */
  parseVideoData(item) {
    const snippet = item.snippet;
    const stats = item.statistics;
    const status = item.status;
    const contentDetails = item.contentDetails;

    return {
      videoId: item.id,
      title: snippet.title,
      description: snippet.description,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      channelId: snippet.channelId,
      channelName: snippet.channelTitle,
      publishedAt: new Date(snippet.publishedAt),
      duration: contentDetails?.duration || '0:00',
      categoryId: snippet.categoryId,
      tags: snippet.tags || [],
      viewCount: parseInt(stats.viewCount || 0),
      likeCount: parseInt(stats.likeCount || 0),
      commentCount: parseInt(stats.commentCount || 0),
      privacyStatus: status?.privacyStatus || 'private',
      uploadStatus: status?.uploadStatus || 'processed',
      madeForKids: snippet.contentDetails?.madeForKids || false,
      licensedContent: snippet.contentDetails?.licensedContent || false
    };
  }

  /**
   * Get API quota usage info
   */
  async getQuotaUsage() {
    try {
      // Note: YouTube API v3 doesn't provide quota info via API
      // This is a placeholder for tracking
      return {
        estimatedQuota: 10000, // Default quota
        unitsUsed: 0, // You need to track this manually
        remainingQuota: 10000
      };
    } catch (error) {
      logger.error('Error getting quota usage:', error);
      return null;
    }
  }
}

module.exports = new YouTubeAPI();
