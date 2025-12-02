# YouTube WAV Downloader

A simple Node.js application to download YouTube videos as WAV audio files.

## Prerequisites

**IMPORTANT**: You must install `yt-dlp` and `ffmpeg` on your machine separately before running this application.

### Installing yt-dlp and ffmpeg

- **macOS**: 
  ```bash
  brew install yt-dlp ffmpeg
  ```
- **Linux**: 
  ```bash
  sudo apt install yt-dlp ffmpeg
  # or
  pip install yt-dlp
  sudo apt install ffmpeg
  ```
- **Windows**: 
  - Download yt-dlp from https://github.com/yt-dlp/yt-dlp/releases
  - Download ffmpeg from https://ffmpeg.org/download.html

## Local Installation

```bash
npm install
npm start
```

Then open your browser to `http://localhost:3000` and enter a YouTube URL to download.

## Deployment

### Railway

1. Create a Railway account at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub repository
4. Railway will automatically detect the `nixpacks.toml` file and install dependencies
5. Your app will be deployed and you'll get a public URL

### Render

1. Create a Render account at https://render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Set:
   - **Build Command**: `pip install yt-dlp && npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
5. Add buildpacks or use a Dockerfile (see below)

### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && pip3 install yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

Then deploy to any Docker-compatible platform (Railway, Render, Fly.io, etc.)

### Environment Variables

- `PORT`: Server port (default: 3000)
- `YTDLP_PATH`: Path to yt-dlp executable (auto-detected if not set)
