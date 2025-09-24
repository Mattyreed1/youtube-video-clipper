import { Actor } from "apify";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

/**
 * Helper function to clean YouTube video URL by removing problematic parameters.
 * @param {string} url - The URL to clean.
 * @returns {Object} - Object with cleaned URL and list of removed parameters.
 */
const cleanYouTubeUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return { cleanedUrl: null, removedParams: [], error: 'Video URL must be a non-empty string.' };
    }

    try {
        const urlObj = new URL(url);
        
        // Check if it's a YouTube URL
        if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
            return { cleanedUrl: null, removedParams: [], error: 'URL must be a valid YouTube video URL (youtube.com or youtu.be).' };
        }

        // Check for valid video ID format first
        let videoId = null;
        if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1); // Remove leading slash
        } else if (urlObj.pathname === '/watch') {
            videoId = urlObj.searchParams.get('v');
        }

        if (!videoId || videoId.length !== 11) {
            return { cleanedUrl: null, removedParams: [], error: 'URL must contain a valid YouTube video ID (11 characters).' };
        }

        // Parameters to remove that cause issues
        const paramsToRemove = ['list', 'playlist', 'index', 't', 'start', 'end', 'time_continue'];
        const removedParams = [];

        // Remove problematic parameters
        for (const param of paramsToRemove) {
            if (urlObj.searchParams.has(param)) {
                removedParams.push(param);
                urlObj.searchParams.delete(param);
            }
        }

        // Reconstruct the cleaned URL
        const cleanedUrl = urlObj.toString();

        return { cleanedUrl, removedParams };
    } catch (error) {
        return { cleanedUrl: null, removedParams: [], error: 'Invalid URL format.' };
    }
};

/**
 * Helper function to validate YouTube video URL format.
 * @param {string} url - The URL to validate.
 * @returns {Object} - Object with isValid boolean and error message if invalid.
 */
const validateYouTubeUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return { isValid: false, error: 'Video URL must be a non-empty string.' };
    }

    try {
        const urlObj = new URL(url);
        
        // Check if it's a YouTube URL
        if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
            return { isValid: false, error: 'URL must be a valid YouTube video URL (youtube.com or youtu.be).' };
        }

        // Check for valid video ID format
        let videoId = null;
        if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1); // Remove leading slash
        } else if (urlObj.pathname === '/watch') {
            videoId = urlObj.searchParams.get('v');
        }

        if (!videoId || videoId.length !== 11) {
            return { isValid: false, error: 'URL must contain a valid YouTube video ID (11 characters).' };
        }

        return { isValid: true };
    } catch (error) {
        return { isValid: false, error: 'Invalid URL format.' };
    }
};

/**
 * Helper function to generate a random string.
 * @param {number} length - The length of the random string.
 * @returns {string} - The generated random string.
 */
const randomString = (length) => crypto.randomBytes(length).toString("hex");

/**
 * Helper function to parse time string (HH:MM:SS) into seconds.
 * @param {string} time - The time string to parse.
 * @returns {number} - The time in seconds.
 */
const timeToSeconds = (time) => {
    // Handles HH:MM:SS, MM:SS, SS formats
    if (!time) return 0;
    const parts = String(time).split(':').map(Number);
    if (parts.some(isNaN)) {
        console.log(`[WARN] Invalid time format "${time}" provided, defaulting to 0s.`);
        return 0;
    }
    return parts.reverse().reduce((acc, val, i) => acc + val * (60 ** i), 0);
};

/**
 * Helper function to charge events using Apify SDK
 * @param {string} eventName - The name of the event to charge for
 * @returns {Promise<boolean>} - Returns true if charge was successful
 */
async function chargeEvent(eventName) {
    try {
        await Actor.charge({ eventName });
        console.log(`[CHARGE] Successfully charged for event: ${eventName}`);
        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to charge for event ${eventName}:`, error.message);
        return false;
    }
}

// Function to upload a file to the key-value store
async function uploadToStorage(filePath, fileType, clipIdentifier) {
    const store = await Actor.openKeyValueStore();
    const storeId = process.env.APIFY_DEFAULT_KEY_VALUE_STORE_ID || 'default';

    const fileBuffer = fs.readFileSync(filePath);
    const contentType = fileType === "video" ? "video/mp4" : "image/jpeg";
    const key = `${clipIdentifier}_${Date.now()}_${randomString(16)}.${
        fileType === "video" ? "mp4" : "jpg"
    }`;

    console.log(
        `Uploading ${fileType} to Key-Value Store. Key: ${key}, Content-Type: ${contentType}`
    );
    await store.setValue(key, fileBuffer, { contentType });

    // Return the correct public URL for the file
    return `https://api.apify.com/v2/key-value-stores/${storeId}/records/${key}?disableRedirect=true`;
}

Actor.main(async () => {
    // Get and validate actor input
    const input = await Actor.getInput();
    const {
        videoUrl,
        clips,
        proxy,
        useCookies,
        cookies,
        maxRetries = 3,
        maxResolution = 480, // New optional input, defaults to 480p
    } = input;

    if (!videoUrl || !clips || !Array.isArray(clips) || clips.length === 0) {
        await Actor.fail('Invalid input: "videoUrl" and a non-empty "clips" array are required.');
        return;
    }

    // Clean and validate YouTube URL format before processing
    const urlCleaning = cleanYouTubeUrl(videoUrl);
    if (urlCleaning.error) {
        await Actor.fail(`Invalid video URL: ${urlCleaning.error}`);
        return;
    }

    // Use cleaned URL if parameters were removed
    let processedVideoUrl = videoUrl;
    if (urlCleaning.removedParams.length > 0) {
        processedVideoUrl = urlCleaning.cleanedUrl;
        console.log(`Cleaned video URL by removing parameters: ${urlCleaning.removedParams.join(', ')}`);
        console.log(`Original URL: ${videoUrl}`);
        console.log(`Cleaned URL: ${processedVideoUrl}`);
    }

    // Charge for run_started event immediately
    const runStartCharged = await chargeEvent('run_started');

    if (!runStartCharged) {
        console.warn('[WARN] Failed to charge for run_started event, but continuing execution');
    }

    // Create a temporary directory for processing
    const tempDir = path.join(os.tmpdir(), `video-processing-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Temporary directory created at: ${tempDir}`);

    let processedCount = 0;
    let failedCount = 0;

    // --- Set up shared configurations ---
    let cookieFilePath = null;
    if (useCookies && cookies) {
        cookieFilePath = path.join(tempDir, `cookies_${Date.now()}.txt`);
        fs.writeFileSync(cookieFilePath, cookies);
    }

    let proxyConfiguration = null;
    if (!proxy || proxy.useApifyProxy !== false) {
        const proxyOptions = {
            groups: proxy?.apifyProxyGroups?.length > 0 ? proxy.apifyProxyGroups : ["RESIDENTIAL"],
        };
        console.log("Using Apify Proxy for all network requests.");
        proxyConfiguration = await Actor.createProxyConfiguration(proxyOptions);
        if (!proxyConfiguration) {
            await Actor.fail("Failed to create proxy configuration.");
            return;
        }
    } else {
        console.log("Proxy has been explicitly disabled.");
    }

    // Establish a sticky proxy session so all range requests share the same IP
    let sharedProxyUrl = null;
    if (proxyConfiguration) {
        const proxySessionName = `youtube_clipper_${randomString(6)}`;
        sharedProxyUrl = await proxyConfiguration.newUrl(proxySessionName);
        console.log(`Sticky proxy session initialised: ${proxySessionName}`);
    }

    try {
        // Process each clip
        for (const [index, clip] of clips.entries()) {
            const clipIdentifier = `clip_${(clip.name || index + 1).replace(/\s+/g, '_')}`;
            let clipPath = null;
            let thumbnailPath = null;
            console.log(`Processing ${clipIdentifier}...`);

            try {
                // --- Create clip using yt-dlp section downloader (progressive format) ---
                const startTime = timeToSeconds(clip.start);
                const endTime = timeToSeconds(clip.end);
                const duration = endTime - startTime;

                if (duration <= 0) {
                    throw new Error(`Invalid clip duration (${duration}s). End time must be after start time.`);
                }

                console.log(`Creating clip: ${clip.name} from ${clip.start} to ${clip.end} (${duration}s)`);

                // Choose resolution cap: default 480p, allow 720p if explicitly requested
                const height = Number(maxResolution) === 720 ? 720 : 480;
                const formatSelector = `best[height<=${height}]`;

                // Prepare file paths
                clipPath = path.join(tempDir, `${clipIdentifier}.mp4`);

                // First attempt: download with resolution cap
                let ytDlpCommand = `yt-dlp --quiet -f "${formatSelector}" --download-sections "*${startTime}-${endTime}" --no-part --no-mtime --remux-video mp4 -o "${clipPath}" "${processedVideoUrl}"`;

                // Append cookies if provided
                if (cookieFilePath) {
                    ytDlpCommand += ` --cookies "${cookieFilePath}"`;
                }

                // Reuse the shared proxy URL for all clips instead of generating a new one each time
                if (sharedProxyUrl) {
                    ytDlpCommand += ` --proxy "${sharedProxyUrl}"`;
                }

                console.log(`Executing yt-dlp for clip (capped at ${height}p): ${clip.name}`);
                let downloadSucceeded = false;
                try {
                    execSync(ytDlpCommand, { stdio: "inherit", timeout: 1800000 }); // 30-min safety timeout
                    downloadSucceeded = true;
                } catch (err) {
                    console.warn(`Resolution-capped download failed, retrying without cap → ${err.message}`);
                }

                // Fallback: try again without the -f selector if the first attempt failed
                if (!downloadSucceeded) {
                    ytDlpCommand = `yt-dlp --quiet --download-sections "*${startTime}-${endTime}" --no-part --no-mtime --remux-video mp4 -o "${clipPath}" "${processedVideoUrl}"`;
                    if (cookieFilePath) ytDlpCommand += ` --cookies "${cookieFilePath}"`;
                    if (sharedProxyUrl) ytDlpCommand += ` --proxy "${sharedProxyUrl}"`;
                    console.log("Executing yt-dlp fallback with no resolution cap");
                    execSync(ytDlpCommand, { stdio: "inherit", timeout: 1800000 });
                }

                if (!fs.existsSync(clipPath)) {
                    throw new Error('yt-dlp did not produce the expected output file.');
                }

                // --- Generate a thumbnail from the created clip ---
                thumbnailPath = path.join(tempDir, `${clipIdentifier}.jpg`);
                const ffmpegBase = `ffmpeg -hide_banner -loglevel error -y`;
                try {
                    const thumbnailCommand = `${ffmpegBase} -i "${clipPath}" -ss 1 -frames:v 1 -q:v 2 "${thumbnailPath}"`;
                    execSync(thumbnailCommand, { stdio: 'pipe', timeout: 60000 });
                } catch (thumbnailErr) {
                    console.warn(`Thumbnail generation failed: ${thumbnailErr.message}`);
                    thumbnailPath = null;
                }

                // --- Upload clip and thumbnail ---
                const clipUrl = await uploadToStorage(clipPath, 'video', clipIdentifier);
                const thumbnailUrl = thumbnailPath ? await uploadToStorage(thumbnailPath, 'image', clipIdentifier) : null;

                // Charge for clip_processed event only after successful processing
                const clipCharged = await chargeEvent('clip_processed');

                const clipData = {
                    name: clip.name || `clip_${index + 1}`,
                    description: clip.text || `Clip from ${clip.start} to ${clip.end}`,
                    startTime: clip.start,
                    endTime: clip.end,
                    url: clipUrl,
                    thumbnailUrl,
                    duration,
                    size: fs.statSync(clipPath).size,
                    outputFormat: 'mp4',
                    clipIndex: index + 1,
                    videoUrl: processedVideoUrl,
                    processingTime: new Date().toISOString(),
                    failed: false,
                    charged: clipCharged, // Track if charging was successful
                };

                await Actor.pushData(clipData);
                processedCount++;
            } catch (error) {
                console.error(`Failed to process clip ${clip.name}:`, error);
                await Actor.pushData({
                    name: clip.name || `clip_${index + 1}`,
                    description: clip.text || `Clip from ${clip.start} to ${clip.end}`,
                    startTime: clip.start,
                    endTime: clip.end,
                    error: error.message,
                    clipIndex: index + 1,
                    videoUrl: processedVideoUrl,
                    processingTime: new Date().toISOString(),
                    failed: true,
                    charged: false, // Failed clips are not charged
                });
                failedCount++;
            } finally {
                if (clipPath && fs.existsSync(clipPath)) fs.rmSync(clipPath);
                if (thumbnailPath && fs.existsSync(thumbnailPath)) fs.rmSync(thumbnailPath);
            }
        }
    } catch (error) {
        if (error.message.includes('Sign in to confirm')) {
            await Actor.fail('A fatal error occurred: YouTube is blocking the download, requiring a sign-in. Please provide a fresh, valid cookie file from a logged-in browser session to continue.');
        } else {
            console.error(`A fatal error occurred: ${error.message}`);
            await Actor.fail(`Actor execution failed fatally: ${error.message}`);
        }
    } finally {
        // Clean up the temporary directory and cookies
        if (cookieFilePath && fs.existsSync(cookieFilePath)) {
            fs.rmSync(cookieFilePath);
        }
        if (fs.existsSync(tempDir)) {
            console.log(`Cleaning up temporary directory: ${tempDir}`);
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }

    // Push a final summary object
    const summary = {
        totalClips: clips.length,
        processedCount,
        failedCount,
        runStartCharged,
        runFinished: new Date().toISOString(),
    };
    await Actor.pushData({ '#summary': true, ...summary });
    console.log('--- Run Summary ---');
    console.log(JSON.stringify(summary, null, 2));
});