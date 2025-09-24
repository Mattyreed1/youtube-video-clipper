# YouTube Video Clipper

YouTube Video Clipper is a powerful tool that downloads YouTube videos and extracts multiple clips from them based on specified timestamps. Perfect for creating social media content, highlights, or short clips from longer videos.

## What is YouTube Video Clipper?

YouTube Video Clipper allows you to:
- Download any YouTube video
- Extract multiple clips with precise timestamps
- Generate thumbnails automatically
- Get direct download URLs for clips and thumbnails
- Handle various video qualities and formats

All you need is a YouTube URL and a list of timestamps for the clips you want to extract.

## How to use YouTube Video Clipper?

YouTube Video Clipper is designed to be user-friendly and straightforward:

1. **Create a free Apify account** using your email
2. **Open YouTube Video Clipper** in Apify Console
3. **Add the YouTube video URL** you want to clip
4. **Specify your clips** with start and end timestamps
5. **Click "Start"** and wait for the clips to be processed

## 🚀 Usage

To run the actor, provide the following input:
*   **YouTube Video URL**: The URL of the video you want to clip.
*   **Clips to Extract**: A JSON array defining the `name`, `start` time, and `end` time for each clip.

The actor is designed for maximum reliability and cost-efficiency. It automatically downloads the best available video quality and uses a high-performance "stream copy" method to create clips. This process avoids re-encoding the video, which significantly reduces CPU usage and lowers the cost of each run.

### Example Input
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "clips": [
    { "name": "clip_1", "start": "00:01:15", "end": "00:01:25" },
    { "name": "clip_2", "start": "00:02:40", "end": "00:02:50" }
  ]
}
```

### Resource Configuration

For most use cases, this actor is designed to be lightweight. To manage costs effectively, we recommend the following default resource allocation in your Actor settings:

-   **Memory:** 1024 MB (1 GB)
-   **Compute Units (CUs):** 0.5 CU

This configuration is sufficient for processing most videos. For very long source videos (over an hour), you may need to increase the memory to 2048 MB.

## 🔼 Input sample

The input requires a YouTube video URL and an array of clips with timestamps:

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "clips": [
    {
      "name": "intro_clip",
      "start": "00:00:05",
      "end": "00:00:15"
    },
    {
      "name": "highlight_moment",
      "start": "00:01:30",
      "end": "00:01:45"
    }
  ]
}
```

**Input Parameters:**
- **videoUrl**: The YouTube video URL to process
- **clips**: Array of clips with name, start time, and end time (max 20 clips, 10 min each)
- **quality**: Video quality tier (360p/480p/720p/1080p) - affects pricing
- **proxy**: Optional proxy configuration for blocked regions
- **useCookies**: Optional boolean to enable cookie usage (required if using cookies)
- **cookies**: Optional YouTube cookies for private/restricted videos
- **maxRetries**: Number of retry attempts with exponential backoff (default: 3)

Go to the input tab for a full explanation of the JSON input format.

## 🔽 Output sample

Each processed clip returns detailed information including direct download URLs:

```json
{
  "name": "intro_clip",
  "description": "Clip from 00:00:05 to 00:00:15",
  "startTime": "00:00:05",
  "endTime": "00:00:15",
  "url": "https://api.apify.com/v2/key-value-stores/.../clip_video.mp4",
  "thumbnailUrl": "https://api.apify.com/v2/key-value-stores/.../thumbnail.jpg",
  "duration": 10,
  "size": 2457600,
  "quality": "720p",
  "maxHeight": 720,
  "outputFormat": "mp4",
  "clipIndex": 1,
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "processingTime": "2024-01-15T10:30:45.123Z",
  "failed": false,
  "charged": true,
  "eventCharged": "clip_processed_720p"
}
```

The clips are stored in Apify's key-value store and accessible via direct URLs for immediate use.

## Integrate YouTube Video Clipper and automate your workflow

YouTube Video Clipper can be connected with almost any cloud service or web app thanks to integrations on the Apify platform:

- **Make** - Automate clip creation workflows
- **Zapier** - Connect to thousands of apps
- **Slack** - Get notifications when clips are ready
- **Webhooks** - Trigger actions when processing completes
- **APIs** - Integrate directly with your applications

You can also use webhooks to carry out actions whenever clips are processed, such as automatically posting to social media or storing in your preferred cloud storage.

## Advanced Features

### Quality-Based Pricing
Choose from 4 quality tiers (360p to 1080p) with transparent per-clip pricing.

### Resume & Recovery System
Automatically resume interrupted runs without losing progress or reprocessing completed clips.

### Smart Retry Logic
Built-in exponential backoff retry system handles temporary YouTube blocks and network issues.

### Proxy Support
Handle geo-blocked or rate-limited videos with residential proxy support.

### Cookie Authentication
Access private, age-restricted, or member-only videos using browser cookies.

### Input Validation & Limits
Comprehensive validation with safety limits: max 20 clips per run, 10 minutes per clip.

### Real-time Processing
Clips are processed and uploaded individually as they complete, not in batches.

## Use Cases

- **Social Media Content**: Create clips for Twitter, Instagram, TikTok
- **Educational Content**: Extract key moments from lectures or tutorials
- **Highlights**: Generate highlight reels from longer videos
- **Marketing**: Create promotional clips from product demos
- **Research**: Extract specific segments for analysis

## 💰 Pricing

YouTube Video Clipper uses a **Pay Per Event** pricing model with **quality-based tiers** for transparent and fair billing:

### Event-based Pricing
- **Run Started**: $0.05 per run - Covers setup, proxy initialization, and infrastructure overhead
- **Clip Processed**: Variable cost based on quality tier selected

### Quality Tiers & Pricing
- **360p (Basic)**: $0.07 per clip - Fast processing, smaller files
- **480p (Recommended)**: $0.09 per clip - Best balance of quality and cost
- **720p (High Quality)**: $0.19 per clip - HD quality for professional use
- **1080p (Premium)**: $0.29 per clip - Full HD, highest quality available

### Pricing Examples
- **1 clip (480p)**: $0.05 (run) + $0.09 (clip) = **$0.14 total**
- **5 clips (480p)**: $0.05 (run) + $0.45 (5 clips) = **$0.50 total**
- **10 clips (720p)**: $0.05 (run) + $1.90 (10 clips) = **$1.95 total**
- **20 clips (mixed)**: $0.05 (run) + variable per quality = **$1.45-$5.85 total**

### Key Benefits
✅ **No platform usage charges** - You don't pay for compute units, storage, or proxy usage  
✅ **Only pay for successful results** - Failed clips are not charged  
✅ **Transparent pricing** - Clear per-event costs with no hidden fees  
✅ **Fair base fee** - Fixed $0.05 covers setup costs regardless of run size  

### Free Credits
With the **Apify Free plan's $5 monthly credits**, you can process:
- Up to **71 clips at 360p** ($0.07 each) per month, or
- Up to **55 clips at 480p** ($0.09 each) per month, or
- Up to **26 clips at 720p** ($0.19 each) per month, or
- Up to **17 clips at 1080p** ($0.29 each) per month

**No setup fees** - Start using immediately with your free credits!

## 🔧 API Access

The Apify API gives you programmatic access to YouTube Video Clipper:

**Node.js Example:**
```javascript
import { ApifyApi } from 'apify-client';

const client = new ApifyApi({ token: 'YOUR_API_TOKEN' });
const run = await client.actor('YOUR_ACTOR_ID').call({
  videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
  clips: [
    { name: 'clip1', start: '00:00:10', end: '00:00:20' }
  ]
});
```

**Python Example:**
```python
from apify_client import ApifyClient

client = ApifyClient('YOUR_API_TOKEN')
run = client.actor('YOUR_ACTOR_ID').call(run_input={
    'videoUrl': 'https://www.youtube.com/watch?v=VIDEO_ID',
    'clips': [
        {'name': 'clip1', 'start': '00:00:10', 'end': '00:00:20'}
    ]
})
```

Check out the [Apify API documentation](https://docs.apify.com/api/v2) for full details.

## 🔄 Real-time Webhook Integration

YouTube Video Clipper pushes each clip to the dataset **immediately after processing**, making it perfect for real-time integrations. You can receive instant notifications when clips are ready using webhooks.

### How It Works

1. **Each clip is pushed individually** - As soon as a clip is processed, it's available in the dataset
2. **Webhooks fire immediately** - Get notified for each clip without waiting for the entire run to complete
3. **Upload to your app in real-time** - Process clips as they arrive, not in bulk at the end

### Setting Up Webhooks

Configure webhooks when starting the actor run:

```javascript
const run = await client.actor('YOUR_ACTOR_ID').call({
  videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
  clips: [
    { name: 'clip1', start: '00:00:10', end: '00:00:20' }
  ],
  webhooks: [
    {
      eventTypes: ['ACTOR.RUN.DATASET_ITEM_ADDED'],
      requestUrl: 'https://your-app.com/api/webhooks/new-clip'
    }
  ]
});
```

### Webhook Payload

Your endpoint receives this data for each clip:

```json
{
  "name": "clip1",
  "url": "https://api.apify.com/v2/key-value-stores/.../clip.mp4",
  "thumbnailUrl": "https://api.apify.com/v2/key-value-stores/.../thumb.jpg",
  "duration": 10,
  "size": 2457600,
  "startTime": "00:00:10",
  "endTime": "00:00:20",
  "failed": false
}
```

### Example Implementation

See the `/examples` folder for complete webhook handler implementations:
- `webhook-handler.js` - Basic webhook receiver
- `webhook-handler-production.js` - Production-ready with retry logic
- `run-with-webhook.js` - How to start the actor with webhooks
- `test-webhook-locally.md` - Testing guide with ngrok

## ❓ FAQ

### How much does it cost to use YouTube Video Clipper?
YouTube Video Clipper uses Pay Per Event pricing with quality-based tiers: $0.05 per run plus $0.07-$0.29 per clip depending on quality (360p/480p/720p/1080p). With the Apify Free plan's $5 monthly credits, you can process 17-71 clips per month depending on quality tier.

### What video qualities are supported?
Four quality tiers: 360p ($0.07), 480p ($0.09), 720p ($0.19), and 1080p ($0.29) per clip. Choose based on your needs and budget - higher quality costs more but provides better resolution.

### Can I download private or age-restricted videos?
Yes, by providing YouTube cookies from a logged-in browser session, you can access private, age-restricted, or member-only content.

### What happens if a video is blocked in my region?
Use the proxy configuration with residential proxies to bypass geographical restrictions.

### How long can the clips be?
There's no strict limit on clip duration - you can extract clips from a few seconds to several minutes long.

### What output formats are supported?
All clips are output in MP4 format using stream copying (no re-encoding) to preserve original quality and ensure fast processing.

### Am I charged if a clip fails to process?
No! You're only charged the quality-based "Clip Processed" event ($0.07-$0.29) for clips that are successfully created. Failed clips don't incur any charges, though you'll still pay the $0.05 "Run Started" fee per execution.

### How does Pay Per Event pricing work?
Unlike traditional compute-based pricing, Pay Per Event means you pay for specific actions: starting a run ($0.05) and successfully processing each clip ($0.07-$0.29 based on quality). You don't pay for platform usage like compute units, storage operations, or proxy bandwidth.

### What happens if my run gets interrupted?
The actor automatically saves progress and can resume from where it left off. Already processed clips won't be reprocessed, saving you time and money.

### How many clips can I process at once?
Maximum 20 clips per run, with each clip limited to 10 minutes duration. This ensures optimal performance and cost control.

### How long do clips take to process?
Typically 30-90 seconds per clip depending on duration and quality. The actor uses smart retry logic with 2-minute timeout per clip to prevent endless processing.

## Your feedback

We're always working on improving YouTube Video Clipper. If you've got technical feedback or found a bug, please create an issue on the Actor's Issues tab in Apify Console. 