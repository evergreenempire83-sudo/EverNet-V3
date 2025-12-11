const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

const YOUTUBE_API_KEY = functions.config().youtube.apikey;

// Scheduled function to scan videos daily
exports.dailyVideoScanner = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Starting daily video scan...');
      
      // Get all active videos
      const videosSnapshot = await admin.firestore()
        .collection('scanned_videos')
        .where('isActive', '==', true)
        .limit(100) // Batch size
        .get();
      
      if (videosSnapshot.empty) {
        console.log('No active videos to scan');
        return null;
      }
      
      const scanPromises = [];
      const scanLogs = [];
      
      // Process each video
      for (const videoDoc of videosSnapshot.docs) {
        const videoData = videoDoc.data();
        scanPromises.push(
          scanVideo(videoData.videoId, videoData.creatorId)
            .then(scanResult => {
              scanLogs.push({
                videoId: videoData.videoId,
                ...scanResult
              });
            })
            .catch(error => {
              console.error(`Error scanning video ${videoData.videoId}:`, error);
              scanLogs.push({
                videoId: videoData.videoId,
                error: error.message,
                status: 'failed'
              });
            })
        );
      }
      
      // Wait for all scans to complete
      await Promise.all(scanPromises);
      
      // Update scan logs
      const batch = admin.firestore().batch();
      const scanLogRef = admin.firestore().collection('scan_logs').doc();
      batch.set(scanLogRef, {
        logId: scanLogRef.id,
        totalVideos: videosSnapshot.size,
        successfulScans: scanLogs.filter(log => log.status === 'success').length,
        failedScans: scanLogs.filter(log => log.status === 'failed').length,
        logs: scanLogs,
        scannedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });
      
      await batch.commit();
      
      console.log(`Daily scan completed: ${videosSnapshot.size} videos processed`);
      return null;
    } catch (error) {
      console.error('Error in daily video scanner:', error);
      throw error;
    }
  });

// Individual video scan
async function scanVideo(videoId, creatorId) {
  try {
    // Fetch current view count from YouTube
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'statistics',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });
    
    if (response.data.items.length === 0) {
      throw new Error('Video not found on YouTube');
    }
    
    const currentViews = parseInt(response.data.items[0].statistics.viewCount) || 0;
    
    // Get previous view count from Firestore
    const videoRef = admin.firestore().collection('scanned_videos').doc(videoId);
    const videoDoc = await videoRef.get();
    const videoData = videoDoc.data();
    
    const oldViews = videoData.totalEverNetViews || 0;
    const viewDifference = Math.max(0, currentViews - oldViews);
    
    // Calculate premium views (7% of new views)
    const premiumPercentage = videoData.premiumPercentage || 7;
    const premiumViewsAdded = Math.floor(viewDifference * (premiumPercentage / 100));
    
    // Calculate earnings
    const settingsRef = admin.firestore().collection('settings').doc('app_settings');
    const settingsDoc = await settingsRef.get();
    const settings = settingsDoc.data();
    
    const payoutRate = settings?.payoutRatePer1000 || 0.30;
    const earningsAdded = (premiumViewsAdded / 1000) * payoutRate;
    
    // Update video document
    await videoRef.update({
      totalYouTubeViews: currentViews,
      totalEverNetViews: admin.firestore.FieldValue.increment(viewDifference),
      totalPremiumViews: admin.firestore.FieldValue.increment(premiumViewsAdded),
      currentMonthEarnings: admin.firestore.FieldValue.increment(earningsAdded),
      totalEarnings: admin.firestore.FieldValue.increment(earningsAdded),
      lastScanned: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update creator's current month earnings
    const userRef = admin.firestore().collection('users').doc(creatorId);
    await userRef.update({
      lockedBalance: admin.firestore.FieldValue.increment(earningsAdded),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      status: 'success',
      oldViews,
      newViews: currentViews,
      viewDifference,
      premiumViewsAdded,
      earningsAdded
    };
  } catch (error) {
    console.error(`Error scanning video ${videoId}:`, error);
    throw error;
  }
  }
