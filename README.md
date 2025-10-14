# YouTube Video Clipper

YouTube Video Clipper is a tool that extracts multiple clips from YouTube videos based on specified timestamps. Perfect for creating social media content, highlights, or short clips from longer videos.

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
- **quality**: Video quality tier (360p/480p/720p/1080p) - affects pricing (default: 720p)
- **enableFallbacks**: Allow expensive fallback methods if primary fails (default: true, +$0.09 per fallback)
- **proxy**: Optional proxy configuration for blocked regions
- **useCookies**: Optional boolean to enable cookie usage (required if using cookies)
- **cookies**: Optional YouTube cookies for private/restricted videos
- **maxRetries**: Number of retry attempts with exponential backoff (default: 3)

Go to the input tab for a full explanation of the JSON input format.

## 🔽 Output sample

Each processed clip returns detailed information including direct download URLs:

### Successful Clip

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
  "actualResolution": "720p",
  "actualHeight": 720,
  "qualityWarning": null,
  "outputFormat": "mp4",
  "clipIndex": 1,
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "processingTime": "2025-01-15T10:30:45.123Z",
  "failed": false,
  "charged": true,
  "requestedQuality": "720p",
  "eventCharged": "clip_processed_720p",
  "error": null
}
```

### Failed Clip

If a clip fails to process, you'll receive details about the failure:

```json
{
  "name": "failed_clip",
  "description": "Clip from 00:01:00 to 00:01:10",
  "startTime": "00:01:00",
  "endTime": "00:01:10",
  "url": null,
  "thumbnailUrl": null,
  "duration": null,
  "size": null,
  "quality": "720p",
  "maxHeight": 720,
  "actualResolution": null,
  "actualHeight": null,
  "qualityWarning": null,
  "outputFormat": "mp4",
  "clipIndex": 2,
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "processingTime": "2025-01-15T10:30:47.456Z",
  "failed": true,
  "charged": false,
  "requestedQuality": "720p",
  "eventCharged": null,
  "error": "Video unavailable or download failed"
}
```

### Summary Record

At the end of each run, a summary record is added with run statistics:

```json
{
  "#summary": true,
  "totalClips": 2,
  "processedCount": 1,
  "failedCount": 1,
  "runStartCharged": true,
  "runFinished": "2025-01-15T10:30:50.789Z",
  "qualityUsed": "720p",
  "resumedFromPrevious": false
}
```

All clips are stored in Apify's key-value store and accessible via direct URLs. Failed clips are never charged and include error details for debugging.

## Integrate YouTube Video Clipper and automate your workflow

YouTube Video Clipper can be connected with almost any cloud service or web app thanks to integrations on the Apify platform:

- **n8n** - Automate clip creation workflows
- **Zapier** - Connect to thousands of apps
- **Slack** - Get notifications when clips are ready
- **Webhooks** - Trigger actions when processing completes
- **APIs** - Integrate directly with your applications

You can also use webhooks to carry out actions whenever clips are processed, such as automatically posting to social media or storing in your preferred cloud storage.

## Advanced Features

### Smart Fallback System (New!)
Control reliability vs. cost with the **enableFallbacks** setting:

**Default ON (Recommended)**: Maximum success rate with transparent additional costs
- Primary method fails → Fallback 1 (compatibility mode) → +$0.09 processing charge
- Still fails → Fallback 2 (full video download) → +$0.09 additional charge
- Built-in safeguards prevent excessive costs for very long videos
- Quality limits maintained even in fallback modes

**Fallbacks OFF**: Guaranteed predictable pricing with lower success rate
- Only attempts primary download method
- Clip fails → No additional charges, clear error message
- Perfect for budget-conscious users who prefer predictable costs

### Quality-Based Pricing
Choose from 4 quality tiers (360p to 1080p) with transparent per-clip pricing. Default: 720p (recommended).

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

YouTube Video Clipper uses a **Pay Per Event** pricing model with **fair quality-based pricing**:

### Event-based Pricing

**Current (until October 9, 2025):**
- **Run Started**: $0.05 per run
- **Clip Processed**: $0.09 per clip (flat rate regardless of quality)

**Starting October 9, 2025:**
- **Run Started**: $0.05 per run
- **Quality-Based Fair Pricing**: You pay only for the quality actually delivered
  - **360p**: $0.07 per clip
  - **480p**: $0.09 per clip
  - **720p**: $0.29 per clip
  - **1080p**: $0.39 per clip

### Quality Options & Fair Pricing
- **360p (Basic)**: Social media, smaller files - $0.07
- **480p (Recommended)**: Balanced quality and file size - $0.09
- **720p (High Quality)**: HD quality for professional use - $0.29
- **1080p (Premium)**: Full HD, highest quality - $0.39

**Fair Pricing Promise**: Starting Oct 9, 2025, you only pay for the quality you actually receive. Request 720p but only get 480p? You're only charged the 480p rate!

### Pricing Examples

**Current (until Oct 9, 2025):**
- **1 clip**: $0.05 (run) + $0.09 (clip) = **$0.14 total**
- **5 clips**: $0.05 (run) + $0.45 (5 clips) = **$0.50 total**
- **10 clips**: $0.05 (run) + $0.90 (10 clips) = **$0.95 total**

**Future (starting Oct 9, 2025) - Quality-Based:**
- **5 clips at 360p**: $0.05 + $0.35 (5×$0.07) = **$0.40 total**
- **5 clips at 480p**: $0.05 + $0.45 (5×$0.09) = **$0.50 total**
- **5 clips at 720p**: $0.05 + $1.45 (5×$0.29) = **$1.50 total**
- **Mixed quality**: Pay exactly for what you receive!

**With Fallback Processing (when needed):**
- **1 clip at 720p + 1 fallback**: $0.05 (run) + $0.09 (fallback) + $0.29 (clip) = **$0.43 total**
- **1 clip at 720p + 2 fallbacks**: $0.05 (run) + $0.18 (2 fallbacks) + $0.29 (clip) = **$0.52 total**
- **Fallbacks disabled, clip fails**: $0.05 (run) + $0.00 (no clip charge) = **$0.05 total**

### Key Benefits
✅ **Fair quality-based pricing** - Starting Oct 9, 2025: pay only for quality delivered
✅ **No platform usage charges** - You don't pay for compute units, storage, or proxy usage
✅ **Only pay for successful results** - Failed clips are not charged
✅ **Transparent pricing** - Clear per-event costs with automatic Apify discounts
✅ **Smooth transition** - Current users keep flat $0.09 until Oct 9, 2025  

### Free Credits

**Current (until Oct 9, 2025):**
With the **Apify Free plan's $5 monthly credits**, you can process:
- Up to **55 clips** ($0.09 each) per month

**Future (starting Oct 9, 2025):**
With the **Apify Free plan's $5 monthly credits**, you can process:
- Up to **71 clips at 360p** ($0.07 each) per month
- Up to **55 clips at 480p** ($0.09 each) per month
- Up to **17 clips at 720p** ($0.29 each) per month
- Up to **12 clips at 1080p** ($0.39 each) per month

*Remember the $0.05 run fee applies to each session*

**No setup fees** - Start using immediately with your free credits!

## 🎯 Quality Delivery & Notifications

### How Quality Selection Works
- **Request any quality**: Choose from 360p, 480p, 720p, or 1080p based on your needs
- **Automatic fallback**: If your requested quality isn't available, the highest available quality is delivered
- **Clear notifications**: You'll see warnings in logs and output when quality differs from requested
- **Fair pricing transition**:
  - **Until Oct 9, 2025**: Flat $0.09 regardless of quality delivered
  - **Starting Oct 9, 2025**: Pay only for the quality you actually receive

### Quality Notifications
When the delivered quality differs from requested, you'll see:

**Current (until Oct 9, 2025):**
- **Console warnings**: `⚠️ QUALITY NOTICE: Requested 720p but video source only available at 480p. Charged flat rate ($0.09).`

**Future (starting Oct 9, 2025):**
- **Fair pricing notices**: `⚠️ QUALITY NOTICE: Requested 720p but video source only available at 480p. Charged 480p rate (fair pricing).`

**Always available:**
- **Dataset fields**: `actualResolution`, `actualHeight`, `requestedQuality`, and `qualityWarning` show complete transparency
- **Charging transparency**: See exactly which event was charged in `eventCharged` field

### Example Quality Scenarios

**Current (until Oct 9, 2025):**
- **720p requested, 720p available**: Delivered at 720p, charged $0.09
- **720p requested, 480p max available**: Delivered at 480p, charged $0.09 with notice
- **480p requested, 1080p available**: Delivered at 480p (as requested), charged $0.09

**Future (starting Oct 9, 2025):**
- **720p requested, 720p available**: Delivered at 720p, charged $0.29
- **720p requested, 480p max available**: Delivered at 480p, charged $0.09 (fair!)
- **480p requested, 1080p available**: Delivered at 480p, charged $0.09

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
YouTube Video Clipper uses Pay Per Event pricing with a transition to fair quality-based pricing:

**Current (until Oct 9, 2025):** $0.05 per run + $0.09 per clip (flat rate)
**Starting Oct 9, 2025:** $0.05 per run + quality-based pricing (360p: $0.07, 480p: $0.09, 720p: $0.29, 1080p: $0.39)

You only pay for the quality actually delivered - if you request 720p but the video source only supports 480p, you're charged the 480p rate. With Apify's $5 monthly free credits, you can process 55 clips until Oct 9, then 71 clips at 360p or 55 at 480p.

### What video qualities are supported?
Four quality tiers: 360p (Basic), 480p (Standard), 720p (Recommended - default), and 1080p (Premium). Until Oct 9, 2025: flat $0.09 per clip. After Oct 9: fair pricing based on actual quality delivered (360p: $0.07, 480p: $0.09, 720p: $0.29, 1080p: $0.39). If your requested quality isn't available from the source video, you receive the highest available quality and pay only for what you actually get.

### What happens if a clip fails to download?
By default, the Smart Fallback System (enableFallbacks: true) automatically tries alternative methods with a small additional fee ($0.09 per fallback). This dramatically improves success rates. You can disable fallbacks for guaranteed pricing but lower reliability. Failed clips are never charged - you only pay for successful downloads plus any fallback processing used.

### Can I download private or age-restricted videos?
Yes, by providing YouTube cookies from a logged-in browser session, you can access private, age-restricted, or member-only content.

### What happens if a video is blocked in my region?
Use the proxy configuration with residential proxies to bypass geographical restrictions.

### How long can the clips be?
There's no strict limit on clip duration - you can extract clips from a few seconds to several minutes long.

### What output formats are supported?
All clips are output in MP4 format using stream copying (no re-encoding) to preserve original quality and ensure fast processing.

### Am I charged if a clip fails to process?
No! You're only charged for clips that are successfully created. Failed clips don't incur any charges, though you'll still pay the $0.05 "Run Started" fee per execution. Until Oct 9, 2025: $0.09 per successful clip. After Oct 9: quality-based rates (360p: $0.07, 480p: $0.09, 720p: $0.29, 1080p: $0.39).

### How does Pay Per Event pricing work?
Unlike traditional compute-based pricing, Pay Per Event means you pay for specific actions: starting a run ($0.05) and successfully processing each clip. Until Oct 9, 2025: flat $0.09 per clip. After Oct 9: quality-based pricing (360p: $0.07, 480p: $0.09, 720p: $0.29, 1080p: $0.39) with fair pricing - you only pay for the quality actually delivered. You don't pay for platform usage like compute units, storage operations, or proxy bandwidth.

### What happens if my run gets interrupted?
The actor automatically saves progress and can resume from where it left off. Already processed clips won't be reprocessed, saving you time and money.

### How many clips can I process at once?
Maximum 20 clips per run, with each clip limited to 10 minutes duration. This ensures optimal performance and cost control.

### How long do clips take to process?
**Expected processing time for a 60-second clip:**
- Normal conditions: **5-15 seconds** (optimized with 4 concurrent fragment downloads)
- With network hiccups: **30-60 seconds** (automatic retries handle brief issues)
- Poor network/proxy: **2-3 minutes** (multiple retry attempts with sticky proxy sessions)

The actor uses concurrent fragment downloads (`-N 4`) to achieve 3-5x faster speeds than sequential downloads. Adaptive timeouts (3-12 minutes based on clip duration) ensure downloads complete even under poor network conditions. Processing time scales roughly with clip duration - a 5-minute clip takes proportionally longer than a 1-minute clip.

**Performance optimizations include:**
- 4 concurrent fragment downloads for parallel processing
- Smart buffer management (16KB chunks)
- Sticky proxy sessions to maintain IP consistency
- HLS format skipping for faster progressive downloads

### Troubleshooting slow downloads or timeouts

If you experience timeouts or very slow processing (>5 minutes per clip), try these solutions:

**1. SSL/Network errors (`ETIMEDOUT`, `SSL: UNEXPECTED_EOF_WHILE_READING`)**
- The actor includes automatic retry logic with 10 retries per fragment and concurrent downloads
- Adaptive timeouts adjust based on clip duration (3-12 min range)
- If still failing: try providing fresh cookies from a logged-in YouTube session

**2. Proxy issues**
- The default residential proxy may have slow/unstable connections
- Actor uses sticky proxy sessions to maintain consistent IP across requests
- Consider trying different proxy groups in settings

**3. YouTube throttling**
- YouTube may throttle repeated requests from the same IP
- Solution: Provide cookies from authenticated session
- Alternative: Wait a few minutes before retrying

**4. Very long videos with short clips**
- Section downloads may fail due to fragmented requests
- Actor will automatically fallback to full video download (additional $0.09 charge)
- For videos >30 minutes, consider downloading longer clip durations

## Your feedback

We're always working on improving YouTube Video Clipper. If you've got technical feedback or found a bug, please create an issue on the Actor's Issues tab in Apify Console. 