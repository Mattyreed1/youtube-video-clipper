import express from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';

const app = express();

// Parse raw body for signature verification
app.use(express.raw({ type: 'application/json' }));

/**
 * Production webhook handler with retry logic and error handling
 */
app.post('/api/webhooks/apify/clips', async (req, res) => {
    // Immediately respond to Apify to prevent timeout
    res.status(200).send('OK');
    
    // Process webhook asynchronously
    processWebhookAsync(req.body, req.headers)
        .catch(error => {
            console.error('Webhook processing failed:', error);
            // Log to your error tracking service
            // await logToSentry(error);
        });
});

/**
 * Async webhook processor
 */
async function processWebhookAsync(rawBody, headers) {
    try {
        // 1. Verify webhook signature
        const signature = headers['apify-webhook-signature'];
        if (process.env.VERIFY_WEBHOOKS === 'true') {
            if (!verifySignature(rawBody, signature)) {
                throw new Error('Invalid webhook signature');
            }
        }
        
        // 2. Parse the payload
        const data = JSON.parse(rawBody.toString());
        
        // 3. Skip summary objects
        if (data['#summary']) {
            await handleRunSummary(data);
            return;
        }
        
        // 4. Handle failed clips
        if (data.failed) {
            await handleFailedClip(data);
            return;
        }
        
        // 5. Process successful clips with retry logic
        await processClipWithRetry(data);
        
    } catch (error) {
        console.error('Webhook processing error:', error);
        throw error;
    }
}

/**
 * Process clip with automatic retry on failure
 */
async function processClipWithRetry(clipData, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Download clip from Apify storage
            const clipBuffer = await downloadFile(clipData.url);
            const thumbnailBuffer = clipData.thumbnailUrl 
                ? await downloadFile(clipData.thumbnailUrl) 
                : null;
            
            // Upload to your storage (S3 example)
            const urls = await uploadToStorage({
                clipBuffer,
                thumbnailBuffer,
                clipName: clipData.name,
                metadata: clipData
            });
            
            // Save to database
            await saveToDatabase({
                ...clipData,
                storageUrl: urls.videoUrl,
                thumbnailStorageUrl: urls.thumbnailUrl,
                status: 'completed',
                uploadedAt: new Date()
            });
            
            // Notify user (via websocket, push notification, etc.)
            await notifyUser({
                type: 'clip_ready',
                clipName: clipData.name,
                url: urls.videoUrl
            });
            
            console.log(`✅ Clip processed: ${clipData.name}`);
            return; // Success - exit retry loop
            
        } catch (error) {
            console.error(`Attempt ${attempt}/${retries} failed for ${clipData.name}:`, error.message);
            
            if (attempt === retries) {
                // Final attempt failed - save to dead letter queue
                await saveToDeadLetterQueue(clipData, error);
                throw error;
            }
            
            // Exponential backoff before retry
            await sleep(Math.pow(2, attempt) * 1000);
        }
    }
}

/**
 * Download file from URL with timeout
 */
async function downloadFile(url, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.buffer();
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Upload to your storage service (S3 example)
 */
async function uploadToStorage({ clipBuffer, thumbnailBuffer, clipName, metadata }) {
    // Example S3 upload implementation
    // const AWS = require('aws-sdk');
    // const s3 = new AWS.S3();
    
    const timestamp = Date.now();
    const safeClipName = clipName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // const videoKey = `clips/${timestamp}_${safeClipName}.mp4`;
    // const thumbnailKey = `thumbnails/${timestamp}_${safeClipName}.jpg`;
    
    // const videoUpload = await s3.upload({
    //     Bucket: process.env.S3_BUCKET,
    //     Key: videoKey,
    //     Body: clipBuffer,
    //     ContentType: 'video/mp4',
    //     Metadata: {
    //         originalUrl: metadata.videoUrl,
    //         duration: String(metadata.duration),
    //         startTime: metadata.startTime,
    //         endTime: metadata.endTime
    //     }
    // }).promise();
    
    // For demo purposes, return Apify URLs
    return {
        videoUrl: metadata.url,
        thumbnailUrl: metadata.thumbnailUrl
    };
}

/**
 * Save clip metadata to database
 */
async function saveToDatabase(clipData) {
    // Example database save
    // await db.clips.create({
    //     externalId: clipData.clipIndex,
    //     name: clipData.name,
    //     description: clipData.description,
    //     videoUrl: clipData.storageUrl,
    //     thumbnailUrl: clipData.thumbnailStorageUrl,
    //     duration: clipData.duration,
    //     size: clipData.size,
    //     startTime: clipData.startTime,
    //     endTime: clipData.endTime,
    //     originalVideoUrl: clipData.videoUrl,
    //     processedAt: clipData.processingTime,
    //     uploadedAt: clipData.uploadedAt,
    //     status: clipData.status
    // });
    
    console.log(`Saved to database: ${clipData.name}`);
}

/**
 * Notify user about clip availability
 */
async function notifyUser({ type, clipName, url }) {
    // Example: Send websocket message
    // io.emit('clip-update', { type, clipName, url });
    
    // Example: Send push notification
    // await sendPushNotification({
    //     title: 'Clip Ready!',
    //     body: `Your clip "${clipName}" is ready to view`,
    //     data: { url }
    // });
    
    console.log(`User notified: ${type} - ${clipName}`);
}

/**
 * Handle failed clips
 */
async function handleFailedClip(clipData) {
    console.error(`Failed clip: ${clipData.name} - ${clipData.error}`);
    
    // Save failure to database
    // await db.failedClips.create({
    //     name: clipData.name,
    //     error: clipData.error,
    //     startTime: clipData.startTime,
    //     endTime: clipData.endTime,
    //     videoUrl: clipData.videoUrl,
    //     failedAt: clipData.processingTime
    // });
    
    // Notify user of failure
    await notifyUser({
        type: 'clip_failed',
        clipName: clipData.name,
        error: clipData.error
    });
}

/**
 * Handle run summary
 */
async function handleRunSummary(summary) {
    console.log('Run completed:', summary);
    
    // Update job status
    // await db.jobs.update({
    //     where: { id: jobId },
    //     data: {
    //         status: 'completed',
    //         processedCount: summary.processedCount,
    //         failedCount: summary.failedCount,
    //         completedAt: summary.runFinished
    //     }
    // });
    
    // Send final notification
    await notifyUser({
        type: 'job_completed',
        processedCount: summary.processedCount,
        failedCount: summary.failedCount
    });
}

/**
 * Save failed items to dead letter queue for manual processing
 */
async function saveToDeadLetterQueue(clipData, error) {
    console.error(`Saving to DLQ: ${clipData.name}`);
    
    // await db.deadLetterQueue.create({
    //     type: 'clip_processing',
    //     data: clipData,
    //     error: error.message,
    //     stack: error.stack,
    //     createdAt: new Date()
    // });
}

/**
 * Verify webhook signature
 */
function verifySignature(rawBody, signature) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Sleep helper for retry backoff
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Production webhook handler running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Webhook verification:', process.env.VERIFY_WEBHOOKS === 'true' ? 'enabled' : 'disabled');
});
