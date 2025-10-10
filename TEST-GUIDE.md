# Testing Guide: YouTube Video Clipper Actor

## Quick Test via Apify Console

### 1. Deploy the Fixed Actor

```bash
# Ensure you're on the latest code with the schema fix
git status

# Deploy to Apify (if using Git integration)
git push origin main
```

Or manually upload the fixed `.actor/actor.json` in the Apify Console.

### 2. Run a Test with Sample Input

Use this minimal test input to verify the fix:

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "clips": [
    {
      "name": "test_clip_1",
      "start": "00:00:01",
      "end": "00:00:05"
    }
  ],
  "quality": "480p"
}
```

### 3. Expected Output

The actor should complete successfully and push 2 dataset items:

#### Item 1: Clip Record
```json
{
  "name": "test_clip_1",
  "description": "Clip from 00:00:01 to 00:00:05",
  "startTime": "00:00:01",
  "endTime": "00:00:05",
  "url": "https://api.apify.com/v2/key-value-stores/.../clip.mp4",
  "thumbnailUrl": "https://api.apify.com/v2/key-value-stores/.../thumb.jpg",
  "duration": 4,
  "size": 123456,
  "quality": "480p",
  "maxHeight": 480,
  "actualResolution": "480p",
  "actualHeight": 480,
  "qualityWarning": null,
  "outputFormat": "mp4",
  "clipIndex": 1,
  "videoUrl": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "processingTime": "2025-10-10T...",
  "failed": false,
  "charged": true,
  "requestedQuality": "480p",
  "eventCharged": "clip_processed"
}
```

#### Item 2: Summary Record (THE FIX)
```json
{
  "#summary": true,
  "totalClips": 1,
  "processedCount": 1,
  "failedCount": 0,
  "runStartCharged": true,
  "runFinished": "2025-10-10T...",
  "qualityUsed": "480p",
  "resumedFromPrevious": false
}
```

**✅ If the summary record appears without errors, the bug is fixed!**

---

## Test via Apify API

### Node.js Test Script

```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
    token: 'YOUR_API_TOKEN', // Get from Apify Console
});

async function testActor() {
    console.log('🧪 Testing YouTube Video Clipper via API...\n');

    // Start the actor
    const run = await client.actor('YOUR_ACTOR_ID').call({
        videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        clips: [
            { name: 'test_clip_1', start: '00:00:01', end: '00:00:05' }
        ],
        quality: '480p'
    });

    console.log(`Run ID: ${run.id}`);
    console.log(`Status: ${run.status}`);
    console.log(`\nDataset: https://console.apify.com/storage/datasets/${run.defaultDatasetId}\n`);

    // Get the dataset items
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`✅ Dataset items: ${items.length}`);
    
    // Check for summary record
    const summaryItem = items.find(item => item['#summary'] === true);
    
    if (summaryItem) {
        console.log('✅ Summary record found - BUG IS FIXED!');
        console.log('Summary:', JSON.stringify(summaryItem, null, 2));
    } else {
        console.log('❌ Summary record missing - bug still present');
    }

    // Check for clip records
    const clipItems = items.filter(item => !item['#summary']);
    console.log(`✅ Clip records: ${clipItems.length}`);
    
    return run.status === 'SUCCEEDED' && summaryItem !== undefined;
}

testActor()
    .then(success => {
        if (success) {
            console.log('\n✅ TEST PASSED - Actor works correctly!');
            process.exit(0);
        } else {
            console.log('\n❌ TEST FAILED - Check logs for errors');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Test error:', error);
        process.exit(1);
    });
```

### Python Test Script

```python
from apify_client import ApifyClient

client = ApifyClient('YOUR_API_TOKEN')

def test_actor():
    print('🧪 Testing YouTube Video Clipper via API...\n')
    
    # Start the actor
    run = client.actor('YOUR_ACTOR_ID').call(run_input={
        'videoUrl': 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        'clips': [
            {'name': 'test_clip_1', 'start': '00:00:01', 'end': '00:00:05'}
        ],
        'quality': '480p'
    })
    
    print(f"Run ID: {run['id']}")
    print(f"Status: {run['status']}")
    print(f"\nDataset: https://console.apify.com/storage/datasets/{run['defaultDatasetId']}\n")
    
    # Get dataset items
    dataset_client = client.dataset(run['defaultDatasetId'])
    items = list(dataset_client.iterate_items())
    
    print(f"✅ Dataset items: {len(items)}")
    
    # Check for summary record
    summary_items = [item for item in items if item.get('#summary') is True]
    
    if summary_items:
        print('✅ Summary record found - BUG IS FIXED!')
        print(f"Summary: {summary_items[0]}")
    else:
        print('❌ Summary record missing - bug still present')
    
    # Check for clip records
    clip_items = [item for item in items if not item.get('#summary')]
    print(f"✅ Clip records: {len(clip_items)}")
    
    return run['status'] == 'SUCCEEDED' and len(summary_items) > 0

if __name__ == '__main__':
    try:
        success = test_actor()
        if success:
            print('\n✅ TEST PASSED - Actor works correctly!')
            exit(0)
        else:
            print('\n❌ TEST FAILED - Check logs for errors')
            exit(1)
    except Exception as e:
        print(f'❌ Test error: {e}')
        exit(1)
```

---

## Test via cURL

```bash
# Set your credentials
export APIFY_TOKEN="your_api_token_here"
export ACTOR_ID="your_actor_id_here"

# Start the actor run
RUN_ID=$(curl -s -X POST \
  "https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "clips": [
      {"name": "test_clip_1", "start": "00:00:01", "end": "00:00:05"}
    ],
    "quality": "480p"
  }' | jq -r '.data.id')

echo "Run ID: $RUN_ID"
echo "Monitor: https://console.apify.com/actors/runs/${RUN_ID}"

# Wait for completion (poll every 5 seconds)
while true; do
    STATUS=$(curl -s "https://api.apify.com/v2/acts/${ACTOR_ID}/runs/${RUN_ID}?token=${APIFY_TOKEN}" | jq -r '.data.status')
    echo "Status: $STATUS"
    
    if [ "$STATUS" = "SUCCEEDED" ] || [ "$STATUS" = "FAILED" ]; then
        break
    fi
    
    sleep 5
done

# Get dataset ID
DATASET_ID=$(curl -s "https://api.apify.com/v2/acts/${ACTOR_ID}/runs/${RUN_ID}?token=${APIFY_TOKEN}" | jq -r '.data.defaultDatasetId')

# Get dataset items
curl -s "https://api.apify.com/v2/datasets/${DATASET_ID}/items?token=${APIFY_TOKEN}" | jq '.'

# Check for summary
HAS_SUMMARY=$(curl -s "https://api.apify.com/v2/datasets/${DATASET_ID}/items?token=${APIFY_TOKEN}" | jq '[.[] | select(."#summary" == true)] | length')

if [ "$HAS_SUMMARY" -gt 0 ]; then
    echo "✅ TEST PASSED - Summary record found!"
else
    echo "❌ TEST FAILED - Summary record missing"
fi
```

---

## Validation Checklist

Before deploying to production, verify:

- [ ] Schema validation passes: `node validate-schema.js`
- [ ] Actor completes without errors
- [ ] Dataset contains clip records
- [ ] Dataset contains summary record (with `#summary: true`)
- [ ] All 3 dataset views work:
  - [ ] Overview (all records)
  - [ ] Successful (clips only)
  - [ ] Summary (summary only)
- [ ] Charging events fire correctly
- [ ] No schema validation errors in logs

---

## Known Good Test Videos

These videos are confirmed to work for testing:

1. **Short public video**: `https://www.youtube.com/watch?v=jNQXAC9IVRw`
   - Good for quick tests (< 1 minute)
   - Always available
   
2. **Longer video**: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Good for testing multiple clips
   - Various quality options available

Test clips should be < 10 seconds for fast validation.

