#!/bin/bash
set -e

REPO="yxtcfw/stop-motion"
JSON_FILE="${1:-chat.json}"
DARK="${2:-false}"
TITLE="${3:-微信}"
LEFT_AVATAR="${4:-A}"
RIGHT_AVATAR="${5:-我}"

if [ ! -f "$JSON_FILE" ]; then
  echo "找不到 $JSON_FILE"
  exit 1
fi

JSON_B64=$(base64 -w0 < "$JSON_FILE")

echo "触发渲染..."
gh workflow run render.yml \
  --repo "$REPO" \
  -f json="$JSON_B64" \
  -f dark="$DARK" \
  -f title="$TITLE" \
  -f left_avatar="$LEFT_AVATAR" \
  -f right_avatar="$RIGHT_AVATAR"

echo "等待运行完成..."
RUN_ID=$(gh run list --repo "$REPO" --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN_ID" --repo "$RUN_ID"

mkdir -p downloads
gh run download "$RUN_ID" --repo "$REPO" --dir downloads

echo "完成，视频在 downloads/output.mp4"
