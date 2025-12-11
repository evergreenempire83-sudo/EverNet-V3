const admin = require('firebase-admin');
const axios = require('axios');
const { YOUTUBE_API_KEY } = require('../../config/youtube.config');
const { calculatePremiumViews, calculateEarnings } = require('../utils/calculations');
const logger = require('../utils/logger');

const db = admin.firestore();

class YouTubeScanner {
  constructor() {
    this.apiKey = YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3/videos';
    this.batchSize = 50; // YouTube API limit per request
  }

  /**
   * Scan a single video
   */
  async scanVideo(videoId, creatorId, overrideSettings = {}) {
    try {
      logger.info(`Scanning video: ${videoId}`);
      
      // Get video from database
      const videoRef = db.collection('scanned_videos').doc(videoId);
      const videoDoc = await videoRef.get();
      
      if (!videoDoc.exists) {
        throw new Error(`Video ${videoId} not found in database`);
      }
      
      const videoData = videoDoc.data();
      const previousViews = videoData.totalYouTubeViews || 0;
      
      // Get YouTube data
      const youtubeData = await this.fetchYouTubeData(videoId);
      
      if (!youtubeData) {
        logger.error(`Failed to fetch YouTube data for ${videoId}`);
        await this.logScan(videoId, creatorId, 'failed', {
          error: 'YouTube API returned no data'
        });
        return null;
      }
      
      const currentViews = youtubeData.viewCount;
      const viewDifference = currentViews - previousViews;
      
      // Skip if no new views
      if (viewDifference <= 0) {
        logger.info(`No new views for ${videoId} (${previousViews} → ${currentViews})`);
        await this.logScan(videoId, creatorId, 'no_change', {
          oldViews: previousViews,
          newViews: currentViews,
          viewDifference: 0
        });
        return null;
      }
      
      // Calculate earnings
      const premiumPercentage = overrideSettings.premiumPercentage || videoData.premiumPercentage || 7;
      const premiumRPM = overrideSettings.premiumRPM || videoData.premiumRPM || 0.30;
      
      const premiumViews = calculatePremiumViews(viewDifference, premiumPercentage);
      const earnings = calculateEarnings(premiumViews, premiumRPM);
      
      // Update video data
      const updateData = {
        totalYouTubeViews: currentViews,
        totalEverNetViews: admin.firestore.FieldValue.increment(viewDifference),
        totalPremiumViews: admin.firestore.FieldValue.increment(premiumViews),
        currentMonthViews: admin.firestore.FieldValue.increment(viewDifference),
        currentMonthPremiumViews: admin.firestore.FieldValue.increment(premiumViews),
        currentMonthEarnings: admin.firestore.FieldValue.increment(earnings),
        lastChecked: new Date(),
        lastScanSuccess: true,
        errorCount: 0,
        ...youtubeData
      };
      
      await videoRef.update(updateData);
      
      // Update creator balance (add to locked balance)
      const creatorRef = db.collection('users').doc(creatorId);
      await creatorRef.update({
        lockedBalance: admin.firestore.FieldValue.increment(earnings),
        totalEarnings: admin.firestore.FieldValue.increment(earnings),
        updatedAt: new Date()
      });
      
      // Log the scan
      await this.logScan(videoId, creatorId, 'success', {
        oldViews: previousViews,
        newViews: currentViews,
        viewDifference,
        premiumViewsAdded: premiumViews,
        earningsAdded: earnings,
        youtubeData: {
          views: currentViews,
          likes: youtubeData.likeCount,
          comments: youtubeData.commentCount,
          title: youtubeData.title,
          thumbnail: youtubeData.thumbnail,
          status: youtubeData.status
        }
      });
      
      // Update platform stats
      await this.updatePlatformStats(earnings);
      
      logger.info(`Scan successful: ${videoId} - ${viewDifference} new views, $${earnings.toFixed(2)} earned`);
      
      return {
        videoId,
        viewDifference,
        premiumViews,
        earnings,
        totalEarnings: videoData.currentMonthEarnings + earnings
      };
      
    } catch (error) {
      logger.error(`Error scanning video ${videoId}:`, error);
      
      // Update error count
      const videoRef = db.collection('scanned_videos').doc(videoId);
      await videoRef.update({
        lastScanSuccess: false,
        errorCount: admin.firestore.FieldValue.increment(1),
        lastChecked: new Date()
      });
      
      await this.logScan(videoId, creatorId, 'failed', {
        error: error.message,
        stack: error.stack
      });
      
      return null;
    }
  }

  /**
   * Fetch YouTube video data
   */
  async fetchYouTubeData(videoId) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          part: 'snippet,statistics,contentDetails,status',
          id: videoId,
          key: this.apiKey
        },
        timeout: 10000 // 10 second timeout
      });
      
      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }
      
      const item = response.data.items[0];
      const snippet = item.snippet;
      const stats = item.statistics;
      const status = item.status;
      
      return {
        videoId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        channelId: snippet.channelId,
        channelName: snippet.channelTitle,
        publishedAt: new Date(snippet.publishedAt),
        duration: item.contentDetails?.duration || '0:00',
        categoryId: snippet.categoryId,
        tags: snippet.tags || [],
        viewCount: parseInt(stats.viewCount || 0),
        likeCount: parseInt(stats.likeCount || 0),
        commentCount: parseInt(stats.commentCount || 0),
        status: status.uploadStatus,
        privacyStatus: status.privacyStatus,
        madeForKids: snippet.contentDetails?.madeForKids || false
      };
      
    } catch (error) {
      logger.error(`YouTube API error for ${videoId}:`, error.message);
      throw new Error(`YouTube API failed: ${error.message}`);
    }
  }

  /**
   * Scan all active videos
   */
  async scanAllActiveVideos() {
    try {
      logger.info('Starting scan of all active videos...');
      
      // Get all active videos
      const videosRef = db.collection('scanned_videos')
        .where('isActive', '==', true)
        .where('nextScanAt', '<=', new Date());
      
      const snapshot = await videosRef.get();
      
      if (snapshot.empty) {
        logger.info('No videos to scan');
        return { scanned: 0, earnings: 0 };
      }
      
      const scanPromises = [];
      const results = {
        total: snapshot.size,
        successful: 0,
        failed: 0,
        noChange: 0,
        totalEarnings: 0
      };
      
      // Scan videos in batches to avoid rate limiting
      const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      for (let i = 0; i < videos.length; i += this.batchSize) {
        const batch = videos.slice(i, i + this.batchSize);
        
        for (const video of batch) {
          const scanPromise = this.scanVideo(video.videoId, video.creatorId)
            .then(result => {
              if (result) {
                results.successful++;
                results.totalEarnings += result.earnings;
              } else {
                results.noChange++;
              }
              return result;
            })
            .catch(() => {
              results.failed++;
              return null;
            });
          
          scanPromises.push(scanPromise);
          
          // Delay to avoid rate limiting (50ms between requests)
          if (i > 0 && i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        // Wait for batch to complete
        await Promise.all(scanPromises);
        
        // Update next scan time for scanned videos
        const batchUpdatePromises = batch.map(video => 
          db.collection('scanned_videos').doc(video.videoId).update({
            nextScanAt: this.getNextScanTime(video.scanFrequency)
          })
        );
        
        await Promise.all(batchUpdatePromises);
      }
      
      logger.info(`Scan completed: ${results.successful} successful, ${results.failed} failed, ${results.noChange} no change`);
      logger.info(`Total earnings: $${results.totalEarnings.toFixed(2)}`);
      
      return results;
      
    } catch (error) {
      logger.error('Error scanning all videos:', error);
      throw error;
    }
  }

  /**
   * Add new video for scanning
   */
  async addVideo(videoId, creatorId, adminId, scanFrequency = 'daily') {
    try {
      logger.info(`Adding video ${videoId} for creator ${creatorId}`);
      
      // Verify video exists on YouTube
      const youtubeData = await this.fetchYouTubeData(videoId);
      
      if (!youtubeData) {
        throw new Error('Video not found on YouTube');
      }
      
      // Check if video already exists
      const existingVideo = await db.collection('scanned_videos').doc(videoId).get();
      
      if (existingVideo.exists) {
        throw new Error('Video is already being scanned');
      }
      
      // Get platform settings for default values
      const settingsDoc = await db.collection('settings').doc('app_settings').get();
      const settings = settingsDoc.data();
      
      // Create video document
      const videoData = {
        videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        creatorId,
        thumbnail: youtubeData.thumbnail,
        title: youtubeData.title,
        description: youtubeData.description,
        channelName: youtubeData.channelName,
        channelId: youtubeData.channelId,
        publishedAt: youtubeData.publishedAt,
        duration: youtubeData.duration,
        categoryId: youtubeData.categoryId,
        tags: youtubeData.tags,
        status: youtubeData.privacyStatus === 'public' ? 'active' : 'private',
        isActive: youtubeData.privacyStatus === 'public',
        addedBy: adminId,
        addedAt: new Date(),
        lastChecked: new Date(),
        totalYouTubeViews: youtubeData.viewCount,
        totalEverNetViews: 0,
        totalPremiumViews: 0,
        currentMonthViews: 0,
        currentMonthPremiumViews: 0,
        currentMonthEarnings: 0,
        premiumPercentage: settings.premiumPercentage,
        premiumRPM: settings.defaultPremiumRPM,
        regularRPM: settings.defaultRegularRPM,
        scanFrequency,
        nextScanAt: this.getNextScanTime(scanFrequency),
        lastScanSuccess: true,
        errorCount: 0
      };
      
      await db.collection('scanned_videos').doc(videoId).set(videoData);
      
      // Log the addition
      await db.collection('audit_logs').add({
        action: 'video_added',
        userId: adminId,
        targetId: videoId,
        entityType: 'scanned_video',
        changes: {
          before: null,
          after: videoData
        },
        timestamp: new Date(),
        ipAddress: 'system',
        userAgent: 'scanner',
        details: `Video ${videoId} added for scanning`
      });
      
      logger.info(`Video ${videoId} added successfully`);
      
      return {
        success: true,
        video: videoData
      };
      
    } catch (error) {
      logger.error(`Error adding video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get next scan time based on frequency
   */
  getNextScanTime(frequency) {
    const now = new Date();
    
    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      case 'manual':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days (effectively disabled)
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to daily
    }
  }

  /**
   * Log scan result
   */
  async logScan(videoId, creatorId, status, data) {
    try {
      await db.collection('scan_logs').add({
        videoId,
        creatorId,
        scanTime: new Date(),
        oldViews: data.oldViews,
        newViews: data.newViews,
        viewDifference: data.viewDifference || 0,
        premiumViewsAdded: data.premiumViewsAdded || 0,
        earningsAdded: data.earningsAdded || 0,
        youtubeData: data.youtubeData || {},
        status,
        scannedBy: 'system',
        errorMessage: data.error || '',
        processingTime: data.processingTime || 0,
        apiCalls: 1
      });
    } catch (error) {
      logger.error('Error logging scan:', error);
    }
  }

  /**
   * Update platform stats
   */
  async updatePlatformStats(earningsAdded = 0) {
    try {
      const statsRef = db.collection('platform_stats').doc('current');
      
      await statsRef.update({
        totalLocked: admin.firestore.FieldValue.increment(earningsAdded),
        lastUpdated: new Date()
      });
    } catch (error) {
      logger.error('Error updating platform stats:', error);
    }
  }

  /**
   * Get scan statistics
   */
  async getScanStats(timeRange = '24h') {
    try {
      const now = new Date();
      let startTime;
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      
      // Get scan logs for time range
      const logsRef = db.collection('scan_logs')
        .where('scanTime', '>=', startTime);
      
      const snapshot = await logsRef.get();
      
      let totalScans = 0;
      let successfulScans = 0;
      let totalViews = 0;
      let totalEarnings = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        totalScans++;
        
        if (data.status === 'success') {
          successfulScans++;
          totalViews += data.viewDifference;
          totalEarnings += data.earningsAdded;
        }
      });
      
      // Get active videos count
      const activeVideosRef = db.collection('scanned_videos')
        .where('isActive', '==', true);
      
      const activeVideosSnapshot = await activeVideosRef.get();
      
      return {
        timeRange,
        totalScans,
        successfulScans,
        failedScans: totalScans - successfulScans,
        successRate: totalScans > 0 ? (successfulScans / totalScans) * 100 : 0,
        totalViews,
        totalEarnings,
        activeVideos: activeVideosSnapshot.size,
        lastUpdated: now
      };
      
    } catch (error) {
      logger.error('Error getting scan stats:', error);
      throw error;
    }
  }
}

module.exports = new YouTubeScanner();
