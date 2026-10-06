const { createServer } = require("https");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// Windows için frontend/certs, diğerleri için /etc/ssl/certs
const certPath =
  process.platform === "win32"
    ? path.join(__dirname, "certs")
    : "/etc/ssl/certs";

const httpsOptions = {
  key: fs.readFileSync(path.join(certPath, "server.key")),
  cert: fs.readFileSync(path.join(certPath, "server.crt")),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, (err) => {
    if (err) throw err;
    console.log("> HTTPS Server ready on https://localhost:3000");
  });
});
