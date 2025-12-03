#!/bin/bash

if [ ! -f "cookies_base64_clean.txt" ]; then
    echo "Error: cookies_base64_clean.txt not found"
    echo "Run: base64 -i cookies.txt -o cookies_base64.txt && cat cookies_base64.txt | tr -d '\n' > cookies_base64_clean.txt"
    exit 1
fi

BASE64=$(cat cookies_base64_clean.txt)
TOTAL_LEN=${#BASE64}
CHUNK_SIZE=50000
CHUNK_NUM=1
OFFSET=0

echo "Splitting base64 into chunks of $CHUNK_SIZE characters..."
echo "Total length: $TOTAL_LEN characters"
echo ""

while [ $OFFSET -lt $TOTAL_LEN ]; do
    CHUNK="${BASE64:$OFFSET:$CHUNK_SIZE}"
    CHUNK_LEN=${#CHUNK}
    echo "Creating chunk file: cookies_chunk_$CHUNK_NUM.txt"
    echo "$CHUNK" > "cookies_chunk_$CHUNK_NUM.txt"
    echo "  Length: $CHUNK_LEN characters"
    
    OFFSET=$((OFFSET + CHUNK_SIZE))
    CHUNK_NUM=$((CHUNK_NUM + 1))
done

TOTAL_CHUNKS=$((CHUNK_NUM - 1))
echo ""
echo "Created $TOTAL_CHUNKS chunk files."
echo ""
echo "To add to Render:"
echo "1. For each chunk file (cookies_chunk_1.txt through cookies_chunk_$TOTAL_CHUNKS.txt):"
echo "   - Copy the entire contents"
echo "   - In Render dashboard, add environment variable:"
echo "     Key: YTDLP_COOKIES_BASE64_1 (then _2, _3, etc.)"
echo "     Value: (paste the chunk contents)"
echo ""
echo "2. After adding all chunks, redeploy your service."

