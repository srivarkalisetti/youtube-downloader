# YouTube Cookie Export Instructions

## ⚠️ Important: Use Browser Extension Method

According to yt-dlp documentation, **DO NOT** use `--cookies-from-browser` with `--cookies` together. This exports your regular browser cookies, NOT the private session cookies that won't rotate.

## Correct Method: Browser Extension

### Step 1: Set Up Private Session
1. Open a **NEW private/incognito window** in your browser
2. **Log into YouTube** in that window
3. In the **SAME window and tab**, navigate to: `https://www.youtube.com/robots.txt`
   - This should be the **ONLY tab** open in that private window
4. **Keep that tab open** (don't close it yet)

### Step 2: Export Cookies with Browser Extension

**For Chrome/Edge:**
- Install extension: "Get cookies.txt LOCALLY" or "cookies.txt"
- Click the extension icon
- Select `youtube.com` domain
- Click "Export" or "Copy"
- Save as `cookies.txt` in this directory

**For Firefox:**
- Install extension: "cookies.txt"
- Click the extension icon
- Select `youtube.com` domain
- Click "Export"
- Save as `cookies.txt` in this directory

### Step 3: Close Private Window
- **Immediately close** the private/incognito window after export
- This prevents cookie rotation

### Step 4: Encode and Split
```bash
./encode-cookies.sh
./split-cookies.sh
```

### Step 5: Update Render
- Copy contents of each `cookies_chunk_*.txt` file (1-16)
- Add as environment variables: `YTDLP_COOKIES_BASE64_1`, `YTDLP_COOKIES_BASE64_2`, etc.
- Redeploy

## Rate Limits

- **Guest sessions**: ~300 videos/hour
- **Accounts**: ~2000 videos/hour

Consider adding delays between downloads to avoid rate limits.

## Account Safety

⚠️ Using your account with yt-dlp risks temporary or permanent bans. Consider using a throwaway account.

