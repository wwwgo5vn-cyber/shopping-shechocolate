var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var placesFile = fs.readFileSync(path.join(root, "constants", "places.js"), "utf8");
var ids = [];
placesFile.replace(/"?id"?\s*:\s*"([^"]+)"/g, function (_, id) {
  ids.push(id);
});

var page = [
  "<!DOCTYPE html>",
  '<html lang="vi">',
  "  <head>",
  '    <meta charset="utf-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
  '    <meta name="theme-color" content="" />',
  "    <title></title>",
  '    <base href="/" />',
  '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
  '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  '    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap" rel="stylesheet" />',
  '    <link rel="stylesheet" href="/constants/tokens.css?v=2" />',
  '    <link rel="stylesheet" href="/css/visit.css" />',
  '    <link rel="stylesheet" href="/css/store.css?v=6" />',
  "  </head>",
  "  <body>",
  '    <div id="app"></div>',
  '    <script src="/constants/labels.js?v=8"></script>',
  '    <script src="/constants/visit-labels.js?v=7"></script>',
  '    <script src="/constants/places.js"></script>',
  '    <script src="/js/shop-loader.js?v=8"></script>',
  "  </body>",
  "</html>",
  ""
].join("\n");

ids.forEach(function (id) {
  var dir = path.join(root, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page);
  console.log("/" + id + "/");
});
