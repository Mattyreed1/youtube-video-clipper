import axios from 'axios';

/**
 * Example: Run the YouTube Video Clipper actor with webhook notifications
 */
async function runActorWithWebhook() {
    const APIFY_TOKEN = 'YOUR_APIFY_TOKEN';
    const ACTOR_ID = 'YOUR_ACTOR_ID'; // e.g., 'username/youtube-video-clipper'
    const WEBHOOK_URL = 'https://your-app.com/api/webhooks/new-clip'; // Your app's endpoint
    
    const input = {
        videoUrl: 'https://www.youtube.com/watch?v=example',
        clips: [
            { name: 'Intro', start: '00:00', end: '00:30' },
            { name: 'Main Content', start: '01:00', end: '03:00' }
        ],
        proxy: { useApifyProxy: true }
    };

    try {
        const response = await axios.post(
            `https://api.apify.com/v2/acts/${ACTOR_ID}/runs`,
            {
                ...input,
                // Webhook configuration - this is the key part
                webhooks: [
                    {
                        eventTypes: ['ACTOR.RUN.DATASET_ITEM_ADDED'],
                        requestUrl: WEBHOOK_URL,
                        payloadTemplate: JSON.stringify({
                            // Customize the payload sent to your webhook
                            userId: '{{userId}}',
                            datasetId: '{{datasetId}}',
                            datasetItemId: '{{datasetItemId}}',
                            // The actual clip data will be in {{data}}
                            clipData: '{{data}}'
                        })
                    },
                    {
                        // Optional: Get notified when the entire run completes
                        eventTypes: ['ACTOR.RUN.SUCCEEDED'],
                        requestUrl: `${WEBHOOK_URL}/completed`
                    },
                    {
                        // Optional: Get notified if the run fails
                        eventTypes: ['ACTOR.RUN.FAILED'],
                        requestUrl: `${WEBHOOK_URL}/failed`
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${APIFY_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Actor run started:', response.data);
        console.log('Run ID:', response.data.data.id);
        console.log('Dataset ID:', response.data.data.defaultDatasetId);
        
        return response.data;
    } catch (error) {
        console.error('Failed to start actor:', error.response?.data || error.message);
        throw error;
    }
}

// Run the example
runActorWithWebhook().catch(console.error);
