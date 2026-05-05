const puppeteer = require("puppeteer");
const { spawn } = require("child_process");

async function run() {
  console.log("Starting websocket-server.js...");
  const server = spawn("node", ["websocket-server.js"], {
    env: { ...process.env, PORT: "18991" }
  });

  server.stdout.on("data", (data) => process.stdout.write("Server: " + data));
  server.stderr.on("data", (data) => process.stderr.write("Server Error: " + data));

  await new Promise(resolve => setTimeout(resolve, 2000));

  const browser = await puppeteer.launch({
    headless: "new"
  });
  const page = await browser.newPage();

  page.on("console", msg => console.log("BROWSER CONSOLE:", msg.text()));
  page.on("pageerror", err => console.error("BROWSER ERROR:", err.message));
  page.on("requestfailed", req => console.error("BROWSER REQUEST FAILED:", req.url(), req.failure().errorText));

  console.log("Navigating to http://127.0.0.1:18991/tribes-interface.html");
  try {
    await page.goto("http://127.0.0.1:18991/tribes-interface.html", { waitUntil: "networkidle0" });
  } catch (err) {
    console.error("Failed to load page:", err.message);
  }

  console.log("Logging events for 8 seconds...");
  await new Promise(resolve => setTimeout(resolve, 8000));

  await browser.close();
  server.kill();
  process.exit(0);
}

run().catch(err => {

run().catch(err => {
  console.error(err);
  process.exit(1);
});