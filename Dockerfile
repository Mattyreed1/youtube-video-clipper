# First, specify the base Docker image.
FROM apify/actor-node:18

# The base image is Alpine, so we must use the 'apk' package manager.
# This command updates the package index, installs dependencies including aria2c for faster downloads,
# downloads yt-dlp, makes it executable, and cleans up the cache, all in a single layer.
RUN apk update && apk add --no-cache curl ca-certificates ffmpeg python3 aria2 && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/cache/apk/*

# Copy package.json and package-lock.json to leverage Docker layer caching.
COPY package*.json ./

# Install NPM packages.
RUN npm install

# Next, copy the remaining files and directories with the source code.
# Since we do this after NPM install, quick build will be really fast
# for most source file changes.
COPY . ./

# Specify the command to run when the container starts.
CMD ["npm", "start"]