const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/download', (req, res) => {
  try {
    let { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
    if (videoIdMatch) {
      url = `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
    }

    console.log(`Starting download for URL: ${url}`);

  const tempDir = path.join(__dirname, 'temp');
  const timestamp = Date.now();
  const outputTemplate = path.join(tempDir, `audio_${timestamp}.%(ext)s`);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let ytdlpPath = process.env.YTDLP_PATH;
  
  if (!ytdlpPath) {
    const possiblePaths = [
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      '/opt/homebrew/bin/yt-dlp',
      'yt-dlp'
    ];
    
    for (const path of possiblePaths) {
      if (path === 'yt-dlp' || fs.existsSync(path)) {
        ytdlpPath = path;
        break;
      }
    }
  }
  
  if (!ytdlpPath) {
    ytdlpPath = 'yt-dlp';
  }

  const cookiesBrowser = process.env.YTDLP_COOKIES_BROWSER || '';
  const cookiesFile = process.env.YTDLP_COOKIES_FILE || '';
  
  let cookieArgs = '';
  if (cookiesBrowser) {
    cookieArgs = `--cookies-from-browser ${cookiesBrowser}`;
  } else if (cookiesFile && fs.existsSync(cookiesFile)) {
    cookieArgs = `--cookies ${cookiesFile}`;
  } else {
    cookieArgs = '--extractor-args "youtube:player_client=android"';
  }

  const command = `${ytdlpPath} -f "bestaudio" -x --audio-format wav --no-playlist --postprocessor-args "ffmpeg:-acodec pcm_s16le -ar 44100 -threads 0 -preset ultrafast" --no-warnings --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${cookieArgs} -o "${outputTemplate}" "${url}"`;
  let videoTitle = 'audio';

  console.log(`Executing: ${command}`);

  let isResponseSent = false;
  let childProcess;
  let isProcessComplete = false;

  const cleanup = () => {
    if (childProcess && !childProcess.killed && !isProcessComplete) {
      console.log('Cleaning up child process...');
      childProcess.kill('SIGTERM');
      setTimeout(() => {
        if (childProcess && !childProcess.killed) {
          childProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  };

  const sendError = (message) => {
    if (!isResponseSent && !res.headersSent) {
      isResponseSent = true;
      res.status(500).json({ error: message });
    }
  };

  req.on('close', () => {
    if (!isResponseSent && !isProcessComplete) {
      console.log('Client disconnected, but keeping process alive...');
    }
  });

  const startTime = Date.now();
  const requestTimeout = setTimeout(() => {
    if (!isResponseSent) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`Request timeout after ${elapsed} seconds`);
      cleanup();
      sendError(`Download timeout after ${elapsed} seconds. The video may be too long or the server is slow.`);
    }
  }, 300000);

  console.log(`Starting download at ${new Date().toISOString()}`);
  childProcess = exec(command, { maxBuffer: 100 * 1024 * 1024, timeout: 300000 }, (error, stdout, stderr) => {
    isProcessComplete = true;
    clearTimeout(requestTimeout);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`yt-dlp process completed in ${elapsed} seconds`);

    if (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`yt-dlp FAILED after ${elapsed} seconds`);
      console.error(`yt-dlp error code: ${error.code}`);
      console.error(`yt-dlp error signal: ${error.signal}`);
      console.error(`yt-dlp error message: ${error.message}`);
      console.error(`yt-dlp stdout: ${stdout || '(empty)'}`);
      console.error(`yt-dlp stderr: ${stderr || '(empty)'}`);
      
      if (!isResponseSent) {
        let errorMsg = 'Failed to download audio';
        
        if (error.code === 'ETIMEDOUT' || (error.killed && elapsed > 100)) {
          errorMsg = `Download timeout after ${elapsed} seconds. The video may be too long.`;
        } else if (error.signal === 'SIGTERM' || error.signal === 'SIGKILL') {
          errorMsg = 'Download was terminated. The process may have been killed.';
        } else if (stderr) {
          const stderrLower = stderr.toLowerCase();
          if (stderrLower.includes('not found') || stderrLower.includes('command not found')) {
            errorMsg = 'yt-dlp is not installed. Please install it first.';
          } else if (stderr.includes('ERROR')) {
            const errorMatch = stderr.match(/ERROR:\s*(.+?)(?:\n|$)/);
            errorMsg = errorMatch ? errorMatch[1].trim() : stderr.split('\n').find(line => line.includes('ERROR')) || stderr.substring(0, 200);
          } else if (stderr.includes('WARNING') && !stderr.includes('ERROR')) {
            errorMsg = stderr.split('\n').find(line => line.includes('ERROR')) || 'Download failed. Check server logs for details.';
          } else {
            const lastLines = stderr.split('\n').filter(line => line.trim()).slice(-3).join(' ');
            errorMsg = lastLines || stderr.substring(0, 200);
          }
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        sendError(errorMsg);
      }
      return;
    }

    console.log(`yt-dlp stdout: ${stdout}`);
    if (stderr) {
      console.log(`yt-dlp stderr: ${stderr}`);
    }

    const findAndSendFile = (attempts = 0) => {
      if (isResponseSent) return;

      try {
        if (!fs.existsSync(tempDir)) {
          if (attempts < 20) {
            setTimeout(() => findAndSendFile(attempts + 1), 200);
            return;
          }
          sendError('Temporary directory not found');
          return;
        }

        const files = fs.readdirSync(tempDir);
        console.log(`Files in temp dir: ${files.join(', ')}`);
        const wavFile = files.find(f => f.startsWith(`audio_${timestamp}`) && f.endsWith('.wav'));

        if (!wavFile) {
          if (attempts < 20) {
            if (attempts % 5 === 0) {
              console.log(`WAV file not found yet, attempt ${attempts + 1}/20`);
            }
            setTimeout(() => findAndSendFile(attempts + 1), 200);
            return;
          }
          console.error('No WAV file found after 20 attempts. Available files:', files);
          sendError('Audio file not found after conversion');
          return;
        }

        const actualPath = path.join(tempDir, wavFile);
        if (!fs.existsSync(actualPath)) {
          if (attempts < 20) {
            setTimeout(() => findAndSendFile(attempts + 1), 200);
            return;
          }
          sendError('Audio file not found');
          return;
        }

        const fileSize = fs.statSync(actualPath).size;
        console.log(`Sending file: ${actualPath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

        if (!isResponseSent && !res.headersSent) {
          isResponseSent = true;
          
          const titleCommand = `${ytdlpPath} --get-title --no-playlist ${cookieArgs} "${url}"`;
          exec(titleCommand, { timeout: 10000 }, (titleError, titleStdout) => {
            if (!titleError && titleStdout) {
              videoTitle = titleStdout.trim().replace(/[^\w\s-]/g, '_').substring(0, 100);
            }
            
            res.setHeader('X-Video-Title', videoTitle);
            res.download(actualPath, `${videoTitle}.wav`, (err) => {
              if (err) {
                console.error('Download error:', err);
              } else {
                console.log('File sent successfully');
              }
              if (fs.existsSync(actualPath)) {
                fs.unlinkSync(actualPath);
                console.log('Temporary file deleted');
              }
            });
          });
        }
      } catch (err) {
        console.error('Error reading temp directory:', err);
        if (attempts < 10) {
          setTimeout(() => findAndSendFile(attempts + 1), 500);
        } else {
          sendError('Error processing file');
        }
      }
    };

    findAndSendFile();
  });

  childProcess.stdout.on('data', (data) => {
    console.log(`yt-dlp stdout: ${data}`);
  });

  childProcess.stderr.on('data', (data) => {
    console.log(`yt-dlp stderr: ${data}`);
  });

  childProcess.on('error', (err) => {
    console.error('Child process error:', err);
    if (!isResponseSent) {
      sendError(`Failed to start download process: ${err.message}`);
    }
  });
  } catch (err) {
    console.error('Error in /download route:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: `Server error: ${err.message}` });
    }
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

