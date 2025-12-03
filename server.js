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

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

let globalCookieArgs = '';
const cookiesBrowser = process.env.YTDLP_COOKIES_BROWSER || '';
const cookiesFile = process.env.YTDLP_COOKIES_FILE || '';
const cookiesBase64 = process.env.YTDLP_COOKIES_BASE64 || '';

if (cookiesBrowser) {
  globalCookieArgs = `--cookies-from-browser ${cookiesBrowser}`;
  console.log('Using cookies from browser:', cookiesBrowser);
} else if (cookiesBase64) {
    try {
      const cookiePath = path.join(tempDir, 'cookies.txt');
      
      console.log('Attempting to decode cookies from base64...');
      console.log('Base64 string length:', cookiesBase64.length);
      console.log('First 50 chars of base64:', cookiesBase64.substring(0, 50));
      console.log('Last 50 chars of base64:', cookiesBase64.substring(Math.max(0, cookiesBase64.length - 50)));
      
      const cleanBase64 = cookiesBase64.replace(/\s+/g, '').trim();
      console.log('Cleaned base64 length:', cleanBase64.length);
      
      if (cleanBase64.length === 0) {
        throw new Error('Base64 string is empty after cleaning');
      }
      
      let cookieContent;
      try {
        cookieContent = Buffer.from(cleanBase64, 'base64').toString('utf-8');
      } catch (decodeErr) {
        console.error('Base64 decode error:', decodeErr.message);
        throw new Error(`Failed to decode base64: ${decodeErr.message}`);
      }
      
      console.log('Decoded content length:', cookieContent.length);
      console.log('First 100 chars of decoded:', cookieContent.substring(0, 100));
      
      if (!cookieContent || cookieContent.length === 0) {
        throw new Error('Decoded content is empty');
      }
      
      if (!cookieContent.startsWith('# Netscape HTTP Cookie File')) {
        console.error('ERROR: Decoded cookies do not appear to be in Netscape format');
        console.error('First 500 chars:', cookieContent.substring(0, 500));
        console.error('Base64 length:', cleanBase64.length);
        console.error('Decoded length:', cookieContent.length);
        throw new Error('Decoded content does not start with Netscape cookie file header. First 100 chars: ' + cookieContent.substring(0, 100));
      }
      
      console.log('Cookies decoded successfully, format verified');
      
      fs.writeFileSync(cookiePath, cookieContent, { encoding: 'utf8', mode: 0o644 });
      
      if (!fs.existsSync(cookiePath)) {
        throw new Error('Cookie file was not created');
      }
      
      const stats = fs.statSync(cookiePath);
      console.log(`Cookie file created at startup: ${cookiePath} (${stats.size} bytes)`);
      
      const verifyContent = fs.readFileSync(cookiePath, 'utf8');
      if (!verifyContent.startsWith('# Netscape HTTP Cookie File')) {
        console.error('Verification failed. File content first 200 chars:', verifyContent.substring(0, 200));
        throw new Error('Written cookie file does not have correct format');
      }
      
      const youtubeCookies = verifyContent.split('\n').filter(line => line.includes('youtube.com')).length;
      console.log(`Found ${youtubeCookies} YouTube cookies in file`);
      
      globalCookieArgs = `--cookies "${cookiePath}"`;
      console.log('Cookies loaded from base64 environment variable at startup');
    } catch (err) {
      console.error('ERROR: Failed to decode cookies from base64 at startup:', err.message);
      console.error('Error stack:', err.stack);
      globalCookieArgs = '';
    }
  } else if (cookiesFile) {
  const cookiePath = path.isAbsolute(cookiesFile) ? cookiesFile : path.join(__dirname, cookiesFile);
  if (fs.existsSync(cookiePath)) {
    globalCookieArgs = `--cookies "${cookiePath}"`;
    console.log('Using cookies from file:', cookiePath);
  } else {
    console.warn(`Cookie file not found: ${cookiePath}`);
  }
} else {
  const defaultCookiePath = path.join(__dirname, 'cookies.txt');
  if (fs.existsSync(defaultCookiePath)) {
    globalCookieArgs = `--cookies "${defaultCookiePath}"`;
    console.log('Using cookies from default location:', defaultCookiePath);
  }
}

if (!globalCookieArgs) {
  console.warn('WARNING: No cookies configured. Bot detection may occur. Set YTDLP_COOKIES_BASE64 or YTDLP_COOKIES_FILE environment variable.');
}

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

  const timestamp = Date.now();
  const outputTemplate = path.join(tempDir, `audio_${timestamp}.%(ext)s`);

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

  let isResponseSent = false;
  let childProcess;
  let isProcessComplete = false;
  let videoTitle = 'audio';

  const playerClients = [
    { name: 'ios', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
    { name: 'android', ua: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip' },
    { name: 'web', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    { name: 'mweb', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' }
  ];

  const cookieArgs = globalCookieArgs;
  const hasCookies = !!cookieArgs;

  const buildCommand = (clientIndex) => {
    const client = playerClients[clientIndex];
    let extractorArgs = '';
    let userAgent = client.ua;
    
    if (hasCookies) {
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    } else {
      extractorArgs = `--extractor-args "youtube:player_client=${client.name}"`;
    }
    
    return `${ytdlpPath} -f "bestaudio" -x --audio-format wav --no-playlist --postprocessor-args "ffmpeg:-acodec pcm_s16le -ar 44100 -threads 0 -preset ultrafast" --no-warnings --user-agent "${userAgent}" --referer "https://www.youtube.com/" ${cookieArgs} ${extractorArgs} -o "${outputTemplate}" "${url}"`;
  };

  let currentClientIndex = 0;

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

  const setupProcessHandlers = (proc) => {
    proc.stdout.on('data', (data) => {
      console.log(`yt-dlp stdout: ${data}`);
    });

    proc.stderr.on('data', (data) => {
      console.log(`yt-dlp stderr: ${data}`);
    });

    proc.on('error', (err) => {
      console.error('Child process error:', err);
      if (!isResponseSent) {
        sendError(`Failed to start download process: ${err.message}`);
      }
    });
  };

  const executeDownload = (clientIdx) => {
    const cmd = buildCommand(clientIdx);
    console.log(`Executing with ${playerClients[clientIdx].name} client: ${cmd}`);
    
    const proc = exec(cmd, { maxBuffer: 100 * 1024 * 1024, timeout: 300000 }, (error, stdout, stderr) => {
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
        
        const isBotError = stderr && (stderr.includes('Sign in to confirm') || stderr.includes('bot') || stderr.includes('cookies'));
        
        if (isBotError && !cookieArgs && clientIdx < playerClients.length - 1) {
          const nextIdx = clientIdx + 1;
          console.log(`Bot detection error, trying ${playerClients[nextIdx].name} client...`);
          
          isProcessComplete = false;
          childProcess = executeDownload(nextIdx);
          setupProcessHandlers(childProcess);
          return;
        }
      
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
          
          let titleExtractorArgs = '';
          if (!cookieArgs) {
            titleExtractorArgs = `--extractor-args "youtube:player_client=${playerClients[clientIdx].name}"`;
          }
          const titleCommand = `${ytdlpPath} --get-title --no-playlist ${cookieArgs} ${titleExtractorArgs} "${url}"`;
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
    
    return proc;
  };

  console.log(`Starting download at ${new Date().toISOString()}`);
  childProcess = executeDownload(currentClientIndex);
  setupProcessHandlers(childProcess);
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

