#!/bin/bash
cd ~/stop-motion

# 等 workflow 跑完（最多等 15 分钟）
echo "等待渲染完成..."
for i in $(seq 1 90); do
  STATUS=$(gh run list --limit 1 --json status -q '.[0].status')
  if [ "$STATUS" = "completed" ]; then
    echo "渲染完成，开始下载..."
    gh run download --name output-video
    mv output-video/video.mp4 ./video-$(date +%Y%m%d-%H%M%S).mp4
    echo "已保存到: $(ls video-*.mp4 | tail -1)"
    exit 0
  fi
  echo "  等待中... ($i)"
  sleep 10
done

echo "超时，渲染可能失败了"
exit 1
