#!/bin/bash
# render.sh —— 本地用 gh CLI 触发同一套 workflow_dispatch（参数名与 render.yml 完全一致）
set -e

REPO="yxtcfw/stop-motion"
WF="render.yml"
JSON_FILE="${1:-data.json}"
DARK="${2:-false}"
TITLE="${3:-微信}"
LEFT_AVATAR="${4:-A}"
RIGHT_AVATAR="${5:-我}"

if [ ! -f "$JSON_FILE" ]; then
  echo "找不到 $JSON_FILE"
  exit 1
fi

# 与前端 / workflow 约定一致：data_json 传 base64(UTF-8 JSON)，规避多行 JSON 的传参问题
JSON_B64=$(base64 -w0 < "$JSON_FILE")

echo "触发渲染..."
# 记录触发前本 workflow 的最新 run_number 作为基线，避免误取历史 run
BASE_NUM=$(gh run list --repo "$REPO" --workflow "$WF" --limit 1 \
  --json run_number -q '.[0].run_number // 0')

gh workflow run "$WF" \
  --repo "$REPO" \
  -f data_json="$JSON_B64" \
  -f platform="$TITLE" \
  -f left_name="$LEFT_AVATAR" \
  -f right_name="$RIGHT_AVATAR" \
  -f dark="$DARK"

echo "等待本次运行出现..."
RUN_ID=""
for i in $(seq 1 30); do
  sleep 4
  CAND=$(gh run list --repo "$REPO" --workflow "$WF" --limit 5 \
    --json databaseId,run_number \
    --jq "[.[] | select(.run_number > $BASE_NUM)][0].databaseId // empty")
  if [ -n "$CAND" ]; then RUN_ID="$CAND"; break; fi
done

if [ -z "$RUN_ID" ]; then
  echo "未检测到本次运行，请到 Actions 页面查看"
  exit 1
fi

echo "watch run $RUN_ID ..."
gh run watch "$RUN_ID" --repo "$REPO"   # 关键修正：--repo 传仓库名，不是 run id

mkdir -p downloads
gh run download "$RUN_ID" --repo "$REPO" --dir downloads
echo "完成，视频在 downloads/wechat-video/output.mp4"
