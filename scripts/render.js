import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const FPS = Number(process.env.FPS || 10);
const WIDTH = Number(process.env.WIDTH || 375);
const HEIGHT = Number(process.env.HEIGHT || 666);

const inputJson = process.env.INPUT_JSON || "[]";
const dark = process.env.DARK === "true";
const title = process.env.TITLE || "微信";
const leftAvatar = process.env.LEFT_AVATAR || "A";
const rightAvatar = process.env.RIGHT_AVATAR || "我";

let messages = [];
try {
  messages = JSON.parse(Buffer.from(inputJson, "base64").toString());
} catch {
  console.error("JSON 解析失败");
  process.exit(1);
}

const outDir = path.resolve("output");
const framesDir = path.resolve("frames");

fs.rmSync(outDir, { recursive: true, force: true });
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(framesDir, { recursive: true });

const htmlPath = "file://" + path.resolve("template", "index.html");

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });

await page.goto(htmlPath, { waitUntil: "networkidle0" });

await page.evaluate((data) => {
  const phone = document.getElementById("phone");
  const titleEl = document.getElementById("title");
  const chat = document.getElementById("chat");

  if (data.dark) phone.classList.add("dark");
  titleEl.textContent = data.title;

  chat.innerHTML = "";

  data.messages.forEach((m) => {
    const side = m.side === "right" ? "right" : "left";
    const avatarText = side === "left" ? data.leftAvatar : data.rightAvatar;

    const row = document.createElement("div");
    row.className = "msg " + side;

    const av = document.createElement("div");
    av.className = "avatar";
    av.textContent = avatarText ? avatarText.charAt(0) : "";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = m.content || "";

    row.appendChild(av);
    row.appendChild(bubble);
    chat.appendChild(row);
  });
}, {
  dark,
  title,
  leftAvatar,
  rightAvatar,
  messages
});

for (let i = 0; i < messages.length; i++) {
  const frame = messages.slice(0, i + 1);

  await page.evaluate((data) => {
    const chat = document.getElementById("chat");
    chat.innerHTML = "";

    data.messages.forEach((m) => {
      const side = m.side === "right" ? "right" : "left";
      const avatarText = side === "left" ? data.leftAvatar : data.rightAvatar;

      const row = document.createElement("div");
      row.className = "msg " + side;

      const av = document.createElement("div");
      av.className = "avatar";
      av.textContent = avatarText ? avatarText.charAt(0) : "";

      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = m.content || "";

      row.appendChild(av);
      row.appendChild(bubble);
      chat.appendChild(row);
    });

    chat.scrollTop = chat.scrollHeight;
  }, {
    dark,
    title,
    leftAvatar,
    rightAvatar,
    messages: frame
  });

  await page.waitForNetworkIdle({ timeout: 3000 }).catch(() => {});

const name = String(i).padStart(4, "0");
await page.screenshot({
  path: path.join(framesDir, `frame_${name}.png`),
  captureBeyondViewport: false
});

const outMp4 = path.join(outDir, "output.mp4");

execSync(
  `ffmpeg -y -framerate ${FPS} -i ${framesDir}/frame_%04d.png -pix_fmt yuv420p -c:v libx264 ${outMp4}`,
  { stdio: "inherit" }
);


console.log("生成完成:", outMp4);
