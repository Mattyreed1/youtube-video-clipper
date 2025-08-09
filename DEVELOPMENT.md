# Development Guide - YouTube Video Clipper

This document contains internal development information for maintaining and troubleshooting the YouTube Video Clipper actor.

## Project Structure

```
youtube-video-clipper/
├── .actor/
│   └── INPUT_SCHEMA.json
├── .apify/
├── .gitignore
├── Dockerfile
├── README.md
├── apify.json
├── main.js
└── package.json
```

## How to Set Up and Run

### Step 1: Initial Setup

It is recommended to start projects from an official Apify template to ensure the structure is correct.

```bash
# Install Apify CLI globally if you haven't already
npm install -g apify-cli

# Login to your Apify account
apify login

# Create a new actor from the "Hello world" Node.js template
apify create youtube-video-clipper --template hello_world
```

After creating the actor, replace the template's boilerplate files with the files from this project.

### Step 2: Local Development & Testing

To test the actor on your local machine, first install the local storage dependency:

```bash
# Install Apify local storage emulator
npm install --save-dev @apify/storage-local
```

The `.env` file in this project is already configured to use it:
```
APIFY_LOCAL_STORAGE_DIR=./apify_storage
```

Now, you can run the actor locally. The input schema is defined in `.actor/INPUT_SCHEMA.json`, and you can provide a `test_input.json` file for easy testing.

**Example `test_input.json`:**
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "clips": [
    {
      "name": "test_1",
      "start": "00:00:00",
      "end": "00:00:10"
    }
  ]
}
```

**Run the actor:**
```bash
# Run with pretty print output, using the default input schema
apify run -p

# Or run with a specific input file
apify run -i test_input.json
```

### Step 3: Deployment to Apify Platform

Once you have tested the actor locally, you can deploy it to the Apify platform.

```bash
# Push the actor to the Apify platform
apify push

# Run the actor on the platform
apify run

# View the logs in real-time
apify logs -f
```

**Note on First-Time Build:** The first time you build the actor on the platform, it will need to download and install `ffmpeg` and `yt-dlp`. This can take 2-3 minutes. Subsequent runs will use a cached build and will be much faster.

## Troubleshooting Common Build & Push Errors

This section documents common issues encountered during development and their solutions.

### 1. `apify push` fails with "Actor modified locally"

- **Error:** `Error: Actor with identifier "youtube-video-clipper" is already on the platform and was modified there since modified locally. Skipping push. Use --force to override.`
- **Reason:** This happens when changes have been made to the actor's configuration directly on the Apify platform (e.g., via the web console). The CLI prevents you from accidentally overwriting these remote changes.
- **Solution:** If you are certain that your local version is the correct one, use the `--force` flag to overwrite the remote version.
  ```bash
  apify push --force
  ```

### 2. Build fails with "Input schema is not valid" for proxy editor

- **Error:** `Input schema is not valid (Field schema.properties.proxy.editor must be equal to one of the allowed values: "json", "proxy", "hidden")`
- **Reason:** The `editor` property for a proxy configuration in `.actor/INPUT_SCHEMA.json` has an invalid value.
- **Solution:** In `.actor/INPUT_SCHEMA.json`, find the `proxy` property and ensure its `editor` is set to `"proxy"`.
  ```json
  "proxy": {
    "title": "Proxy configuration",
    "type": "object",
    "description": "Proxy configuration for the run...",
    "editor": "proxy" // Must be "proxy"
  }
  ```

### 3. Input schema validation errors with `prefill`

- **Error:** `Input schema is not valid (Property schema.properties.cookies.prefill is not allowed.)`
- **Reason:** The `prefill` property isn't allowed for certain field types (secret fields, boolean fields with defaults, etc.)
- **Solution:** Remove `prefill` from fields that don't support it:
  - Secret/textarea fields (like `cookies`)
  - Boolean fields with `default` values
  - Integer fields with `default` values

### 4. `Actor.createProxyConfiguration` causes build to fail

- **Error:** A build may fail without a clear error message if `Actor.createProxyConfiguration()` is called incorrectly.
- **Reason:** When using the standard actor proxy service, `Actor.createProxyConfiguration()` must be called *without any arguments*. Passing an object (e.g., from the actor input) is incorrect.
- **Solution:** Change the call in `main.js` from `Actor.createProxyConfiguration(proxy)` to `Actor.createProxyConfiguration()`.
  ```javascript
  if (proxy && proxy.useApifyProxy) {
      // Correct: No arguments
      const proxyConfiguration = await Actor.createProxyConfiguration(); 
      const proxyUrl = await proxyConfiguration.newUrl();
      ytDlpCommand += ` --proxy "${proxyUrl}"`;
  }
  ```

### 5. `apify build` command not found

- **Error:** `Error: command build not found`
- **Reason:** The Apify CLI does not have a standalone `build` command.
- **Solution:** The `apify push` command handles both building the Docker image and deploying (pushing) it to the Apify platform. Use `apify push` instead. 

### 6. Build fails with dependency errors (`apt-get`, `wget`, `curl` not found)

- **Error:** The build log shows errors like `/bin/sh: apt-get: not found`, `/bin/sh: wget: not found`, or `/bin/sh: curl: not found`.
- **Reason:** The `apify/actor-node` base images are built on Alpine Linux, which is very lightweight. It uses the `apk` package manager, not `apt-get` (which is for Debian/Ubuntu). It also does not come with `wget` or `curl` pre-installed. Any `Dockerfile` commands must use `apk` to install dependencies.
- **Solution:** To install a dependency like `yt-dlp`, you must use a `RUN` command that first installs the necessary tools (`curl`, in this case) using `apk`. The following command is a robust way to ensure the latest `yt-dlp` is installed:
  ```dockerfile
  RUN apk update && apk add --no-cache curl ca-certificates && \
      curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
      chmod a+rx /usr/local/bin/yt-dlp && \
      rm -rf /var/cache/apk/*
  ```

## Automated Testing Setup

The actor is configured for Apify's automated testing system with:

- **Default proxy**: Residential proxy enabled by default for best YouTube compatibility
- **Test video**: Uses Rick Roll (dQw4w9WgXcQ) as reliable test content
- **Short clips**: 10-second clips to stay under 5-minute test limit
- **Prefill values**: All required input fields have appropriate defaults

For testing requirements, see: https://docs.apify.com/platform/actors/publishing/test

## Code Conventions

- Follow modern JavaScript (ESM) syntax (`import`/`export`)
- Use descriptive variable and function names
- All external network requests must use proxy when configured
- Clean up temporary files in `finally` blocks
- Use `await Actor.fail()` for fatal errors that should terminate the run
- Push summary object at the end of execution

## Execution

- Use `child_process.execSync` for executing external commands like `yt-dlp` and `ffmpeg` as the actor's workflow is primarily linear.
- Ensure all command output is piped to the parent process's stdio (`{ stdio: 'inherit' }`) for clear logging during development and on the Apify platform.
- For `yt-dlp`, do not specify a format (`-f`). Allow it to automatically select the best available format to maximize reliability.
- For `ffmpeg`, use the `-c copy` flag to perform a stream copy. This avoids re-encoding, which is significantly faster and uses less CPU, reducing run costs.

## Proxy Usage

- All external network requests, especially video downloads, must be routed through Apify's proxy when a proxy is configured in the input. 