const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FPS = 2;
const chat = JSON.parse(Buffer.from(process.env.INPUT_JSON, 'base64').toString());
const dark = process.env.DARK === 'true';
const title = process.env.TITLE || '微信';
const leftAvatar = process.env.LEFT_AVATAR || 'A';
const rightAvatar = process.env.RIGHT_AVATAR || '我';

const outDir = path.join(__dirname, '..', 'output');
const framesDir = path.join(outDir, 'frames');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const avatar = (c, t) => `<div style="width:36px;height:36px;border-radius:6px;background:${c};display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;flex-shrink:0;">${t}</div>`;

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  for (let i = 0; i < chat.length; i++) {
    const isRight = chat[i].side === 'right';
    const bg = dark ? '#111' : '#ededed';
    const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;background:${bg};font-family:-apple-system,sans-serif;">
    <div style="height:44px;background:${dark?'#1c1c1c':'#ededed'};display:flex;align-items:center;justify-content:center;font-size:17px;border-bottom:1px solid ${dark?'#333':'#d6d6d6'}">${title}</div>
    <div style="padding:12px;display:flex;flex-direction:column;gap:12px;">
      ${chat.slice(0, i+1).map(m => { const r = m.side === 'right'; return `<div style="display:flex;gap:8px;align-items:flex-start;justify-content:${r?'flex-end':'flex-start'}">
        ${r ? '' : avatar('#07c160', leftAvatar)}
        <div style="padding:10px 14px;border-radius:12px;max-width:65%;font-size:15px;line-height:1.5;background:${r?'#95ec69':(dark?'#2a2a2a':'#fff')};color:${r?'#000':(dark?'#eee':'#000')};word-break:break-word">${m.content}</div>
        ${r ? avatar('#07c160', rightAvatar) : ''}
      </div>`; }).join('')}
    </div></body></html>`;
    await page.setContent(html);
    await page.screenshot({ path: path.join(framesDir, `frame_${String(i).padStart(4,'0')}.png`), captureBeyondViewport: false });
  }
  await browser.close();
  const outMp4 = path.join(outDir, 'output.mp4');
  execSync(`ffmpeg -y -framerate ${FPS} -i ${framesDir}frame_%04d.png -pix_fmt yuv420p -c:v libx264 -preset fast ${outMp4}`, { stdio: 'inherit' });
  console.log('done: ' + outMp4);
})();
