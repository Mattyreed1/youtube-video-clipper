# Testing Webhooks Locally

## Quick Setup Guide

### 1. Install ngrok (for local webhook testing)
```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### 2. Start your webhook handler
```bash
cd examples
npm install express
node webhook-handler.js
# Server starts on http://localhost:3000
```

### 3. Expose your local server with ngrok
```bash
ngrok http 3000
# You'll get a public URL like: https://abc123.ngrok.io
```

### 4. Update the webhook URL in run-with-webhook.js
```javascript
const WEBHOOK_URL = 'https://abc123.ngrok.io/api/webhooks/new-clip';
```

### 5. Run the actor with webhooks
```bash
node run-with-webhook.js
```

## What Happens

1. Actor starts processing clips
2. For each clip processed, Apify sends a POST request to your webhook
3. Your handler receives the clip data immediately
4. You can upload to your app, notify users, etc. in real-time
5. Final summary is sent when all clips are done

## Webhook Payload Structure

Each webhook call includes:

```json
{
  "name": "Intro",
  "description": "Clip from 00:00 to 00:30",
  "startTime": "00:00",
  "endTime": "00:30",
  "url": "https://api.apify.com/v2/key-value-stores/.../records/clip_Intro_...",
  "thumbnailUrl": "https://api.apify.com/v2/key-value-stores/.../records/clip_Intro_...",
  "duration": 30,
  "size": 2458624,
  "outputFormat": "mp4",
  "clipIndex": 1,
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "processingTime": "2024-01-20T10:15:30.123Z",
  "failed": false,
  "charged": true
}
```

## Production Deployment

For production:
1. Deploy your webhook handler to a public server
2. Use HTTPS endpoints only
3. Implement webhook signature verification for security
4. Add proper error handling and retries
5. Consider using a queue system for processing

## Monitoring

You can monitor webhook deliveries in the Apify Console:
1. Go to your actor run details
2. Check the "Webhooks" tab
3. See delivery status, response codes, and retry attempts
