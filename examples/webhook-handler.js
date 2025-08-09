import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

/**
 * Webhook handler for receiving clip data from Apify
 * This endpoint will be called for each clip as it's processed
 */
app.post('/api/webhooks/new-clip', async (req, res) => {
    try {
        // Optional: Verify webhook signature for security
        // const signature = req.headers['apify-webhook-signature'];
        // if (!verifyWebhookSignature(req.body, signature)) {
        //     return res.status(401).send('Invalid signature');
        // }

        // Extract the clip data from the webhook payload
        const webhookData = req.body;
        
        // The actual clip data structure based on main.js
        const clipData = webhookData.clipData || webhookData.data || webhookData;
        
        // Check if this is a summary object (skip processing)
        if (clipData['#summary']) {
            console.log('Received run summary:', clipData);
            return res.status(200).send('Summary received');
        }

        // Check if this is a failed clip
        if (clipData.failed) {
            console.error(`Failed clip received: ${clipData.name}`, clipData.error);
            // Handle failed clips (e.g., notify user, log to error tracking)
            await handleFailedClip(clipData);
            return res.status(200).send('Failed clip acknowledged');
        }

        // Process successful clip
        console.log(`New clip received: ${clipData.name}`);
        console.log(`- URL: ${clipData.url}`);
        console.log(`- Thumbnail: ${clipData.thumbnailUrl}`);
        console.log(`- Duration: ${clipData.duration}s`);
        console.log(`- Size: ${(clipData.size / 1024 / 1024).toFixed(2)} MB`);

        // Upload to your application
        await uploadClipToYourApp(clipData);

        res.status(200).send('Clip processed successfully');
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Internal server error');
    }
});

/**
 * Handler for when the entire actor run completes
 */
app.post('/api/webhooks/new-clip/completed', async (req, res) => {
    console.log('Actor run completed successfully');
    const runData = req.body;
    
    // You might want to:
    // - Update job status in your database
    // - Send notification to user
    // - Trigger any post-processing workflows
    
    res.status(200).send('Run completion acknowledged');
});

/**
 * Handler for when the actor run fails
 */
app.post('/api/webhooks/new-clip/failed', async (req, res) => {
    console.error('Actor run failed:', req.body);
    const errorData = req.body;
    
    // Handle the failure:
    // - Notify user
    // - Log to error tracking
    // - Maybe retry with different parameters
    
    res.status(200).send('Failure acknowledged');
});

/**
 * Upload clip to your application's storage/database
 */
async function uploadClipToYourApp(clipData) {
    // Example implementation - adapt to your needs
    
    // 1. Download the clip from Apify's storage if needed
    // const clipBuffer = await fetch(clipData.url).then(r => r.buffer());
    
    // 2. Upload to your storage (S3, GCS, etc.)
    // const yourStorageUrl = await uploadToS3(clipBuffer, clipData.name);
    
    // 3. Save metadata to your database
    // await db.clips.create({
    //     name: clipData.name,
    //     description: clipData.description,
    //     url: yourStorageUrl || clipData.url, // Use Apify URL or your own
    //     thumbnailUrl: clipData.thumbnailUrl,
    //     duration: clipData.duration,
    //     startTime: clipData.startTime,
    //     endTime: clipData.endTime,
    //     originalVideoUrl: clipData.videoUrl,
    //     processedAt: clipData.processingTime,
    //     size: clipData.size
    // });
    
    console.log(`Clip "${clipData.name}" uploaded to application`);
}

/**
 * Handle failed clips
 */
async function handleFailedClip(clipData) {
    // Log the failure
    // await db.failedClips.create({
    //     name: clipData.name,
    //     error: clipData.error,
    //     startTime: clipData.startTime,
    //     endTime: clipData.endTime,
    //     videoUrl: clipData.videoUrl,
    //     failedAt: clipData.processingTime
    // });
    
    console.log(`Logged failed clip: ${clipData.name}`);
}

/**
 * Optional: Verify webhook signature for security
 */
function verifyWebhookSignature(payload, signature) {
    // Apify uses HMAC-SHA256 for webhook signatures
    // You'll need to configure a secret in your webhook settings
    const SECRET = process.env.WEBHOOK_SECRET;
    
    if (!SECRET || !signature) return false;
    
    const expectedSignature = crypto
        .createHmac('sha256', SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Webhook handler listening on port ${PORT}`);
    console.log(`Webhook endpoint: http://localhost:${PORT}/api/webhooks/new-clip`);
});
