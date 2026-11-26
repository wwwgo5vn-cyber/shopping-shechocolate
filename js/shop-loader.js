(function () {
  var L = window.VISIT_LABELS;
  var params = new URLSearchParams(window.location.search);
  var id = storeIdFromPath() || params.get("store") || "";
  var place = (window.VISIT_PLACES || []).filter(function (item) {
    return item.id === id;
  })[0] || null;
  window.VISIT_PLACE = place;

  function storeIdFromPath() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    if (!parts.length) return "";
    var last = parts[parts.length - 1];
    if (last === "index.html") last = parts[parts.length - 2] || "";
    if (/\.html$/i.test(last)) return "";
    return decodeURIComponent(last);
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function shell(title, body) {
    document.title = title;
    document.getElementById("app").innerHTML =
      '<div class="visit"><header class="visit-bar"><a href="index.html">' + esc(L.brand) + "</a></header>" +
      '<main class="visit-body"><h1 class="visit-title">' + esc(title) + "</h1>" + body + "</main></div>";
  }

  function load(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src.charAt(0) === "/" || src.indexOf("http") === 0 ? src : "/" + src;
      script.onload = resolve;
      script.onerror = function () { reject(new Error(src)); };
      document.body.appendChild(script);
    });
  }

  if (!place) {
    shell(L.missingTitle, '<p class="visit-lead">' + esc(L.missingBody) + '</p><p><a href="marts.html">' + esc(L.backHome) + "</a></p>");
    return;
  }

  if (!place.shop) {
    var maps = place.mapsUrl
      ? '<p class="place-actions"><a class="action-map" href="' + esc(place.mapsUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(L.directions) + "</a></p>"
      : "";
    shell(place.name, '<p class="visit-lead">' + esc(L.shopSoonTitle) + ". " + esc(L.shopSoonBody) + "</p>" + maps);
    return;
  }

  load(place.storeData + "?v=6").then(function () {
    return load(place.catalog + "?v=6");
  }).then(function () {
    return load("/js/app.js?v=8");
  }).catch(function () {
    shell(place.name, '<p class="visit-lead">' + esc(L.shopSoonBody) + "</p>");
  });
})();
