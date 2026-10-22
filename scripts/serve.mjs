import fs from "node:fs";
import http from "node:http";
import path from "node:path";

// 本地预览：node scripts/serve.mjs [port]
const root = path.resolve(process.cwd(), "dist");
const port = Number(process.argv[2] ?? 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let file = path.join(root, pathname);

  if (!file.startsWith(root)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) file = path.join(root, "404.html");

  const body = fs.readFileSync(file);
  res.writeHead(fs.existsSync(file) ? 200 : 404, {
    "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
  });
  res.end(body);
});

server.listen(port, () => {
  console.log(`预览：http://localhost:${port}/（注意：站点按 BASE_PATH 生成链接，本地预览请先设置 BASE_PATH=/ 再 build）`);
});
