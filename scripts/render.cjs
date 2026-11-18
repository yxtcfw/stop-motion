const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

const DATA_JSON  = process.env.DATA_JSON  || fs.readFileSync('data.json', 'utf8');
const PLATFORM   = process.env.PLATFORM   || '微信';
const LEFT_NAME  = process.env.LEFT_NAME  || 'A';
const RIGHT_NAME = process.env.RIGHT_NAME || '我';

const raw = String(DATA_JSON).trim();
let data;
try {
  data = JSON.parse(raw);
} catch (_) {
  data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
}
if (!Array.isArray(data) || data.length === 0) throw new Error('data.json 必须是非空数组');

const outDir = path.join(__dirname, '..', 'output');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  const html = buildHTML(data, PLATFORM, LEFT_NAME, RIGHT_NAME);
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const frames = data.length;
  const msgs = await page.$$('.msg');
  for (let i = 0; i < frames; i++) {
    const msg = msgs[i];
    if (!msg) throw new Error(`第 ${i} 条消息元素不存在`);
    await msg.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(outDir, `frame-${String(i).padStart(3, '0')}.png`),
    });
  }

  await browser.close();

  execSync(
    `ffmpeg -y -framerate 2 -i "${outDir}/frame-%03d.png" ` +
      `-c:v libx264 -pix_fmt yuv420p "${outDir}/output.mp4"`,
    { stdio: 'inherit' }
  );

  console.log('✅ output.mp4 generated');
})();

function buildHTML(messages, platform, leftName, rightName) {
  const rows = messages
    .map((m) => {
      const isMe = m.sender === rightName;
      const side = isMe ? 'right' : 'left';
      const avatar = isMe ? rightName : leftName;
      return `
        <div class="row ${side}">
          <div class="avatar">${escapeHtml(avatar)}</div>
          <div class="bubble msg">${escapeHtml(m.text)}</div>
        </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=390">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 390px;
    background: #ededed;
    font-family: "Noto Sans CJK SC","WenQuanYi Micro Hei","Microsoft YaHei",sans-serif;
  }
  .row {
    display: flex; align-items: flex-start;
    padding: 10px; gap: 8px;
  }
  .row.left  { flex-direction: row; }
  .row.right { flex-direction: row-reverse; }
  .avatar {
    width: 40px; height: 40px; border-radius: 6px;
    background: #bbb; color: #fff; display: flex;
    align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0;
  }
  .bubble {
    max-width: 240px; padding: 10px 12px; border-radius: 8px;
    background: #fff; font-size: 15px; line-height: 1.5;
  }
  .row.right .bubble { background: #95ec69; }
</style>
</head>
<body>${rows}</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
