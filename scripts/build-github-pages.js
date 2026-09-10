const { copyFileSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const docsDir = path.join(root, "docs");

mkdirSync(docsDir, { recursive: true });

let html = readFileSync(path.join(publicDir, "index.html"), "utf8");
html = html
  .replace(/href="\/styles\.css([^"]*)"/, 'href="./styles.css$1"')
  .replace(/src="\/app-icon\.png([^"]*)"/g, 'src="./app-icon.png$1"')
  .replace(
    /<script src="\/app\.js([^"]*)" defer><\/script>/,
    '<script>window.LISTY_STATIC_MODE = true;</script>\n    <script src="./app.js$1" defer></script>'
  );

writeFileSync(path.join(docsDir, "index.html"), html);
writeFileSync(path.join(docsDir, ".nojekyll"), "");
copyFileSync(path.join(publicDir, "styles.css"), path.join(docsDir, "styles.css"));
copyFileSync(path.join(publicDir, "app.js"), path.join(docsDir, "app.js"));
copyFileSync(path.join(publicDir, "app-icon.png"), path.join(docsDir, "app-icon.png"));

console.log("GitHub Pages files written to docs/");
