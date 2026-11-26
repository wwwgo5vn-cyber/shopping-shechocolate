(function () {
  var L = window.VISIT_LABELS;
  var app = document.getElementById("app");
  var tag = "all";
  var userPos = null;
  var locating = false;
  var locationNote = "";
  document.title = L.martsTitle + " — " + L.brand;
  var theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.content = getComputedStyle(document.documentElement).getPropertyValue("--color-brand").trim();

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function distanceMeters(from, to) {
    var earth = 6371000;
    var lat1 = from.lat * Math.PI / 180;
    var lat2 = to.lat * Math.PI / 180;
    var dLat = (to.lat - from.lat) * Math.PI / 180;
    var dLng = (to.lng - from.lng) * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function formatDistance(meters) {
    if (meters < 1000) return Math.max(1, Math.round(meters)) + " " + L.meterUnit;
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(meters / 1000) + " " + L.kmUnit;
  }

  function directionsHref(place) {
    if (userPos && place.lat != null && place.lng != null) {
      return "https://www.google.com/maps/dir/?api=1&origin=" + userPos.lat + "," + userPos.lng + "&destination=" + place.lat + "," + place.lng;
    }
    return place.mapsUrl || "";
  }

  function places() {
    var list = (window.VISIT_PLACES || []).filter(function (place) {
      return tag === "all" || place.tags.indexOf(tag) !== -1;
    }).map(function (place) {
      var meters = null;
      if (userPos && place.lat != null && place.lng != null) meters = distanceMeters(userPos, place);
      return {
        id: place.id,
        name: place.name,
        area: place.area,
        summary: place.summary,
        tags: place.tags,
        shop: place.shop,
        mapsUrl: place.mapsUrl || "",
        lat: place.lat,
        lng: place.lng,
        meters: meters
      };
    });
    if (!userPos) return list;
    return list.sort(function (a, b) {
      if (a.meters == null && b.meters == null) return 0;
      if (a.meters == null) return 1;
      if (b.meters == null) return -1;
      return a.meters - b.meters;
    });
  }

  function render() {
    var chips = '<button class="tag' + (tag === "all" ? " is-active" : "") + '" type="button" data-tag="all">' + esc(L.allTags) + "</button>";
    window.VISIT_TAGS.forEach(function (id) {
      chips += '<button class="tag' + (tag === id ? " is-active" : "") + '" type="button" data-tag="' + esc(id) + '">' + esc(L.tags[id]) + "</button>";
    });
    var list = places();
    var rank = 0;
    var cards = list.length
      ? list.map(function (place) {
          var tags = place.tags.map(function (id) {
            return '<span class="place-tag">' + esc(L.tags[id] || id) + "</span>";
          }).join("");
          var shop = place.shop
            ? '<a class="action-shop" href="/' + encodeURIComponent(place.id) + '/?from=marts">' + esc(L.enterShop) + "</a>"
            : "";
          var href = directionsHref(place);
          var maps = href
            ? '<a class="action-map" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(L.directions) + "</a>"
            : "";
          var badge = "";
          var distance = "";
          if (place.meters != null) {
            rank += 1;
            badge = '<span class="place-rank">' + rank + "</span>";
            distance = '<p class="place-distance">' + esc(L.distancePrefix) + " " + esc(formatDistance(place.meters)) + "</p>";
          }
          return (
            '<article class="place"><h2>' + badge + esc(place.name) + "</h2>" +
            '<p>' + esc(place.area) + "</p>" +
            distance +
            '<p>' + esc(place.summary) + "</p>" +
            '<div class="place-tags">' + tags + "</div>" +
            '<div class="place-actions">' + shop + maps + "</div></article>"
          );
        }).join("")
      : '<p class="empty-tag">' + esc(L.emptyTag) + "</p>";
    var missingCoords = userPos && list.some(function (place) { return place.meters == null; }) && list.some(function (place) { return place.meters != null; });
    var notes = locationNote ? '<p class="rank-note">' + esc(locationNote) + "</p>" : "";
    if (userPos && list.some(function (place) { return place.meters != null; })) {
      notes += '<p class="rank-note">' + esc(L.rankedInTag) + "</p>";
    }
    if (missingCoords) notes += '<p class="rank-note">' + esc(L.locationNoCoords) + "</p>";
    app.innerHTML =
      '<div class="visit">' +
      '<header class="visit-bar"><a href="index.html">' + esc(L.brand) + "</a></header>" +
      '<main class="visit-body"><h1 class="visit-title">' + esc(L.martsTitle) + "</h1>" +
      '<p class="visit-lead">' + esc(L.martsLead) + "</p>" +
      '<div class="tag-row">' + chips + "</div>" +
      '<button class="near-rank" type="button" data-near="1"' + (locating ? " disabled" : "") + ">" + esc(locating ? L.locating : L.nearRank) + "</button>" +
      notes +
      '<div class="place-list">' + cards + "</div></main></div>";
  }

  app.addEventListener("click", function (event) {
    var near = event.target.closest("[data-near]");
    if (near) {
      if (locating) return;
      if (!navigator.geolocation) {
        locationNote = L.locationDenied;
        render();
        return;
      }
      locating = true;
      locationNote = "";
      render();
      navigator.geolocation.getCurrentPosition(function (position) {
        locating = false;
        userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
        locationNote = "";
        render();
      }, function () {
        locating = false;
        locationNote = L.locationDenied;
        render();
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
      return;
    }
    var button = event.target.closest("[data-tag]");
    if (!button) return;
    tag = button.getAttribute("data-tag");
    render();
  });

  render();
})();
