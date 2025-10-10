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
 * Comprehensive input validation for clips and settings
 * @param {Object} input - The actor input to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validateInput = (input) => {
    const errors = [];
    const { videoUrl, clips, quality = '480p' } = input;

    // Validate video URL
    if (!videoUrl || typeof videoUrl !== 'string') {
        errors.push('Video URL is required and must be a string');
    }

    // Validate clips array
    if (!clips || !Array.isArray(clips)) {
        errors.push('Clips must be provided as an array');
    } else if (clips.length === 0) {
        errors.push('At least one clip must be specified');
    } else if (clips.length > 20) {
        errors.push('Maximum 20 clips allowed per run for cost and performance reasons');
    } else {
        // Validate individual clips
        clips.forEach((clip, index) => {
            if (!clip.start || !clip.end) {
                errors.push(`Clip ${index + 1}: Both start and end times are required`);
                return;
            }

            const startTime = timeToSeconds(clip.start);
            const endTime = timeToSeconds(clip.end);
            const duration = endTime - startTime;

            if (duration <= 0) {
                errors.push(`Clip ${index + 1}: End time must be after start time`);
            } else if (duration > 600) { // 10 minutes max
                errors.push(`Clip ${index + 1}: Maximum clip duration is 10 minutes (600 seconds)`);
            }

            if (!clip.name || typeof clip.name !== 'string') {
                errors.push(`Clip ${index + 1}: Name is required and must be a string`);
            }
        });
    }

    // Validate quality setting
    const validQualities = ['360p', '480p', '720p', '1080p'];
    if (!validQualities.includes(quality)) {
        errors.push(`Quality must be one of: ${validQualities.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Get quality-based format settings
 * @param {string} quality - Quality setting (360p, 480p, 720p, 1080p)
 * @returns {Object} - Quality configuration
 */
const getQualityConfig = (quality = '480p') => {
    const configs = {
        '360p': { height: 360, eventName: 'clip_processed_360p' },
        '480p': { height: 480, eventName: 'clip_processed_480p' },
        '720p': { height: 720, eventName: 'clip_processed_720p' },
        '1080p': { height: 1080, eventName: 'clip_processed_1080p' }
    };
    return configs[quality] || configs['480p'];
};

/**
 * Map actual video height to quality tier and charging event
 * @param {number} height - Actual video height in pixels
 * @returns {Object} - Quality tier info with event name
 */
const getQualityTierFromHeight = (height) => {
    if (!height || height < 360) return { quality: '360p', eventName: 'clip_processed_360p' };
    if (height < 480) return { quality: '360p', eventName: 'clip_processed_360p' };
    if (height < 720) return { quality: '480p', eventName: 'clip_processed_480p' };
    if (height < 1080) return { quality: '720p', eventName: 'clip_processed_720p' };
    return { quality: '1080p', eventName: 'clip_processed_1080p' };
};

/**
 * Determine which charging event to use based on current date
 * @param {string} requestedQuality - Quality tier requested by user
 * @param {Object} actualResolution - Actual resolution detected
 * @returns {string} - Event name to charge
 */
const getChargingEvent = (requestedQuality, actualResolution) => {
    const currentDate = new Date();
    const transitionDate = new Date('2025-10-09');

    // Before October 9, 2025: use current flat pricing
    if (currentDate < transitionDate) {
        return 'clip_processed';
    }

    // After October 9, 2025: use actual quality-based pricing
    if (actualResolution && actualResolution.height) {
        const actualTier = getQualityTierFromHeight(actualResolution.height);
        return actualTier.eventName;
    }

    // Fallback: use requested quality event
    const requestedConfig = getQualityConfig(requestedQuality);
    return requestedConfig.eventName;
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

// Function to detect actual video resolution using ffmpeg
async function detectVideoResolution(filePath) {
    try {
        const command = `ffmpeg -i "${filePath}" 2>&1 | grep -E 'Stream.*Video' | grep -o -E '[0-9]{2,4}x[0-9]{2,4}' | head -1`;
        const result = execSync(command, { encoding: 'utf8' }).trim();
        if (result && result.includes('x')) {
            const [width, height] = result.split('x').map(Number);
            return { width, height, resolution: `${height}p` };
        }
        return null;
    } catch (error) {
        console.warn(`[WARNING] Could not detect video resolution: ${error.message}`);
        return null;
    }
}

/**
 * Execute command with retry logic and exponential backoff
 * @param {string} command - Command to execute
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} timeout - Timeout per attempt in milliseconds
 * @param {string} clipName - Name of clip for logging
 * @returns {Promise<boolean>} - Returns true if successful
 */
async function executeWithRetry(command, maxRetries = 3, timeout = 120000, clipName = '') {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[ATTEMPT ${attempt}/${maxRetries}] Executing command for ${clipName}`);
            execSync(command, { stdio: "inherit", timeout });
            console.log(`[SUCCESS] Command completed successfully for ${clipName}`);
            return true;
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            const errorMsg = error.message || 'Unknown error';

            if (isLastAttempt) {
                console.error(`[FINAL FAILURE] All ${maxRetries} attempts failed for ${clipName}: ${errorMsg}`);
                throw error;
            }

            // Exponential backoff: 5s, 15s, 30s
            const delaySeconds = Math.min(5 * Math.pow(2, attempt - 1), 30);
            console.warn(`[RETRY] Attempt ${attempt} failed for ${clipName}: ${errorMsg}`);
            console.log(`[DELAY] Waiting ${delaySeconds} seconds before retry...`);

            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
    }
    return false;
}

/**
 * Save processing progress to Key-Value store for resume capability
 * @param {Object} progress - Progress object to save
 */
async function saveProgress(progress) {
    try {
        const store = await Actor.openKeyValueStore();
        await store.setValue('processing-progress', progress);
        console.log(`[CHECKPOINT] Progress saved: ${progress.completedClips}/${progress.totalClips} clips processed`);
    } catch (error) {
        console.warn(`[WARN] Failed to save progress: ${error.message}`);
    }
}

/**
 * Load saved processing progress for resume capability
 * @returns {Promise<Object|null>} - Saved progress or null if none exists
 */
async function loadProgress() {
    try {
        const store = await Actor.openKeyValueStore();
        const progress = await store.getValue('processing-progress');
        if (progress) {
            console.log(`[RESUME] Found saved progress: ${progress.completedClips}/${progress.totalClips} clips completed`);
            return progress;
        }
        return null;
    } catch (error) {
        console.warn(`[WARN] Failed to load progress: ${error.message}`);
        return null;
    }
}

/**
 * Clear saved progress after successful completion
 */
async function clearProgress() {
    try {
        const store = await Actor.openKeyValueStore();
        await store.setValue('processing-progress', null);
        console.log('[CLEANUP] Processing progress cleared');
    } catch (error) {
        console.warn(`[WARN] Failed to clear progress: ${error.message}`);
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
        quality = '720p', // Quality tier for pricing and format
        enableFallbacks = true // Allow expensive fallback methods
    } = input;

    // Comprehensive input validation
    const validation = validateInput(input);
    if (!validation.isValid) {
        await Actor.fail(`Input validation failed:\n${validation.errors.join('\n')}`);
        return;
    }

    // Get quality configuration
    const qualityConfig = getQualityConfig(quality);
    const currentDate = new Date();
    const transitionDate = new Date('2025-10-09');

    if (currentDate < transitionDate) {
        console.log(`Processing clips at ${quality} quality (max height: ${qualityConfig.height}px, flat cost: $0.09 per clip)`);
    } else {
        console.log(`Processing clips at ${quality} quality (max height: ${qualityConfig.height}px, charged for actual quality delivered)`);
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

    // Check for saved progress to enable resume functionality
    const savedProgress = await loadProgress();
    let processedClipNames = new Set();

    if (savedProgress && savedProgress.videoUrl === processedVideoUrl) {
        processedCount = savedProgress.processedCount || 0;
        failedCount = savedProgress.failedCount || 0;
        processedClipNames = new Set(savedProgress.processedClipNames || []);
        console.log(`[RESUME] Resuming from previous run with ${processedCount} completed and ${failedCount} failed clips`);
    } else {
        console.log('[NEW RUN] Starting fresh processing run');
    }

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

            // Skip already processed clips for resume functionality
            if (processedClipNames.has(clip.name)) {
                console.log(`[SKIP] Clip "${clip.name}" already processed in previous run`);
                continue;
            }

            let clipPath = null;
            let thumbnailPath = null;
            console.log(`Processing ${clipIdentifier}... (${index + 1}/${clips.length})`);

            try {
                // --- Create clip using yt-dlp section downloader (progressive format) ---
                const startTime = timeToSeconds(clip.start);
                const endTime = timeToSeconds(clip.end);
                const duration = endTime - startTime;

                if (duration <= 0) {
                    throw new Error(`Invalid clip duration (${duration}s). End time must be after start time.`);
                }

                console.log(`Creating clip: ${clip.name} from ${clip.start} to ${clip.end} (${duration}s)`);

                // Use quality-based resolution selection with better format fallbacks
                const height = qualityConfig.height;
                const formatSelector = `best[height<=${height}]/best[ext=mp4]/best`;

                // Prepare file paths
                clipPath = path.join(tempDir, `${clipIdentifier}.mp4`);

                // First attempt: download with resolution cap and better options
                let ytDlpCommand = `yt-dlp --extractor-args "youtube:skip=hls" --no-check-certificates --ignore-errors --no-playlist -f "${formatSelector}" --download-sections "*${startTime}-${endTime}" --no-part --no-mtime --remux-video mp4 -o "${clipPath}" "${processedVideoUrl}"`;

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
                const clipTimeout = 120000; // 2 minutes per clip - much more reasonable

                try {
                    downloadSucceeded = await executeWithRetry(
                        ytDlpCommand,
                        maxRetries,
                        clipTimeout,
                        `${clip.name} (${quality})`
                    );
                } catch (err) {
                    console.warn(`Resolution-capped download failed after ${maxRetries} attempts, trying without cap`);
                    downloadSucceeded = false;
                }

                // Fallback: try with most compatible settings
                if (!downloadSucceeded && enableFallbacks) {
                    console.log("Primary method failed. Attempting Fallback 1 (compatibility mode) - additional $0.09 charge will apply");

                    // Optimize format selector to respect quality limits
                    const height = qualityConfig.height;
                    const fallbackCommand = `yt-dlp --no-check-certificates --ignore-errors --no-playlist -f "best[height<=${height}]/worst" --download-sections "*${startTime}-${endTime}" --no-part --no-mtime --remux-video mp4 -o "${clipPath}" "${processedVideoUrl}"`;
                    let fallbackCmd = fallbackCommand;
                    if (cookieFilePath) fallbackCmd += ` --cookies "${cookieFilePath}"`;
                    if (sharedProxyUrl) fallbackCmd += ` --proxy "${sharedProxyUrl}"`;

                    try {
                        await executeWithRetry(
                            fallbackCmd,
                            maxRetries,
                            clipTimeout,
                            `${clip.name} (fallback)`
                        );

                        // Charge additional clip_processed event for fallback processing
                        if (fs.existsSync(clipPath)) {
                            const fallbackCharged = await chargeEvent('clip_processed');
                            if (fallbackCharged) {
                                console.log("Fallback 1 successful - additional processing charge ($0.09) applied");
                            } else {
                                console.warn("Fallback 1 successful but failed to charge additional processing fee");
                            }
                        }
                    } catch (fallbackError) {
                        console.warn(`Fallback 1 failed: ${fallbackError.message}`);
                    }
                } else if (!downloadSucceeded && !enableFallbacks) {
                    console.log("Primary method failed but fallbacks are disabled. Clip processing will fail.");
                }

                // Final fallback: download full video and extract with ffmpeg if yt-dlp section download fails
                if (!fs.existsSync(clipPath) && enableFallbacks) {
                    // Safeguard: Skip expensive full video downloads for very long videos with short clips
                    const clipDurationMinutes = duration / 60;
                    const videoTooLongForFullDownload = clipDurationMinutes < 5; // Less than 5 minutes clip

                    if (videoTooLongForFullDownload) {
                        console.log("⚠️ Safeguard: Skipping full video download for short clip. This prevents excessive bandwidth costs.");
                        console.log("Consider using a longer clip duration or enabling cookies/proxy for better compatibility.");
                    } else {
                        console.log("Section download failed, attempting Fallback 2 (full video download + extraction) - additional $0.09 charge will apply");
                        console.log("⚠️ WARNING: This method downloads the entire video and may use significant bandwidth");

                        const fullVideoPath = path.join(tempDir, `full_video_${clipIdentifier}.%(ext)s`);
                        // Respect quality limits even for full video downloads
                        const height = qualityConfig.height;
                        const fullVideoCommand = `yt-dlp --no-check-certificates --ignore-errors -f "best[height<=${height}]/best[ext=mp4]/best" --no-part --no-mtime -o "${fullVideoPath}" "${processedVideoUrl}"`;

                        let fullVideoCmd = fullVideoCommand;
                        if (cookieFilePath) fullVideoCmd += ` --cookies "${cookieFilePath}"`;
                        if (sharedProxyUrl) fullVideoCmd += ` --proxy "${sharedProxyUrl}"`;

                        try {
                            await executeWithRetry(
                                fullVideoCmd,
                                2, // Fewer retries for full video
                                180000, // 3 minutes for full video
                                `${clip.name} (full video)`
                            );

                            // Find the downloaded file
                            const downloadedFiles = fs.readdirSync(tempDir).filter(f => f.startsWith(`full_video_${clipIdentifier}`));
                            if (downloadedFiles.length > 0) {
                                const fullVideoFile = path.join(tempDir, downloadedFiles[0]);

                                // Extract section with ffmpeg
                                const ffmpegCommand = `ffmpeg -hide_banner -loglevel error -y -i "${fullVideoFile}" -ss ${startTime} -t ${duration} -c copy "${clipPath}"`;
                                execSync(ffmpegCommand, { stdio: 'pipe', timeout: 60000 });

                                // Clean up full video file
                                fs.rmSync(fullVideoFile);
                                console.log(`Successfully extracted ${duration}s clip using ffmpeg`);

                                // Charge additional clip_processed event for full video fallback processing
                                const fallback2Charged = await chargeEvent('clip_processed');
                                if (fallback2Charged) {
                                    console.log("Fallback 2 successful - additional processing charge ($0.09) applied");
                                } else {
                                    console.warn("Fallback 2 successful but failed to charge additional processing fee");
                                }
                            }
                        } catch (ffmpegError) {
                            console.warn(`Final fallback failed: ${ffmpegError.message}`);
                        }
                    }
                } else if (!fs.existsSync(clipPath) && !enableFallbacks) {
                    console.log("All fallback methods disabled and primary method failed. Clip processing failed.");
                }

                if (!fs.existsSync(clipPath)) {
                    throw new Error('All download strategies failed to produce the expected output file.');
                }

                // --- Check actual resolution of created clip ---
                const actualResolution = await detectVideoResolution(clipPath);
                const requestedHeight = qualityConfig.height;
                let qualityWarning = '';

                if (actualResolution && actualResolution.height < requestedHeight) {
                    const currentDate = new Date();
                    const transitionDate = new Date('2025-10-09');

                    if (currentDate < transitionDate) {
                        // Before transition: flat pricing
                        qualityWarning = `⚠️  QUALITY NOTICE: Requested ${quality} but video source only available at ${actualResolution.resolution}. Charged flat rate ($0.09).`;
                    } else {
                        // After transition: fair pricing based on actual quality
                        const actualTier = getQualityTierFromHeight(actualResolution.height);
                        qualityWarning = `⚠️  QUALITY NOTICE: Requested ${quality} but video source only available at ${actualResolution.resolution}. Charged ${actualTier.quality} rate (fair pricing).`;
                    }
                    console.log(`[QUALITY NOTICE] ${clip.name}: ${qualityWarning}`);
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

                // Determine the correct charging event based on actual quality delivered
                const chargingEventName = getChargingEvent(quality, actualResolution);
                const clipCharged = await chargeEvent(chargingEventName);

                const clipData = {
                    name: clip.name || `clip_${index + 1}`,
                    description: clip.text || `Clip from ${clip.start} to ${clip.end}`,
                    startTime: clip.start,
                    endTime: clip.end,
                    url: clipUrl,
                    thumbnailUrl,
                    duration,
                    size: fs.statSync(clipPath).size,
                    quality: quality,
                    maxHeight: qualityConfig.height,
                    actualResolution: actualResolution ? actualResolution.resolution : null,
                    actualHeight: actualResolution ? actualResolution.height : null,
                    qualityWarning: qualityWarning || null,
                    outputFormat: 'mp4',
                    clipIndex: index + 1,
                    videoUrl: processedVideoUrl,
                    processingTime: new Date().toISOString(),
                    failed: false,
                    charged: clipCharged,
                    requestedQuality: quality,
                    eventCharged: chargingEventName
                };

                await Actor.pushData(clipData);
                processedCount++;
                processedClipNames.add(clip.name);

                // Save progress after each successful clip
                await saveProgress({
                    videoUrl: processedVideoUrl,
                    totalClips: clips.length,
                    completedClips: processedCount + failedCount,
                    processedCount,
                    failedCount,
                    processedClipNames: Array.from(processedClipNames),
                    lastProcessedAt: new Date().toISOString()
                });
            } catch (error) {
                console.error(`Failed to process clip ${clip.name}:`, error);
                await Actor.pushData({
                    name: clip.name || `clip_${index + 1}`,
                    description: clip.text || `Clip from ${clip.start} to ${clip.end}`,
                    startTime: clip.start,
                    endTime: clip.end,
                    url: null,
                    thumbnailUrl: null,
                    duration: null,
                    size: null,
                    quality: quality,
                    maxHeight: qualityConfig.height,
                    actualResolution: null,
                    actualHeight: null,
                    qualityWarning: null,
                    outputFormat: 'mp4',
                    clipIndex: index + 1,
                    videoUrl: processedVideoUrl,
                    processingTime: new Date().toISOString(),
                    failed: true,
                    charged: false,
                    requestedQuality: quality,
                    eventCharged: null,
                    error: error.message,
                });
                failedCount++;
                processedClipNames.add(clip.name); // Mark as attempted to avoid reprocessing

                // Save progress after failure too
                await saveProgress({
                    videoUrl: processedVideoUrl,
                    totalClips: clips.length,
                    completedClips: processedCount + failedCount,
                    processedCount,
                    failedCount,
                    processedClipNames: Array.from(processedClipNames),
                    lastProcessedAt: new Date().toISOString()
                });
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

    // Clear progress on successful completion
    await clearProgress();

    // Push a final summary object
    const summary = {
        totalClips: clips.length,
        processedCount,
        failedCount,
        runStartCharged,
        runFinished: new Date().toISOString(),
        qualityUsed: quality,
        resumedFromPrevious: savedProgress !== null
    };
    await Actor.pushData({ '#summary': true, ...summary });
    console.log('--- Run Summary ---');
    console.log(JSON.stringify(summary, null, 2));
});