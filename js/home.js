(function () {
  var L = window.VISIT_LABELS;
  var app = document.getElementById("app");
  var chocolate = (window.VISIT_PLACES || []).filter(function (place) {
    return place.id === "she-chocolate";
  })[0];
  var shopHref = chocolate ? "/" + chocolate.id + "/?from=home" : "/marts.html";
  document.title = L.metaTitle;
  var theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.content = getComputedStyle(document.documentElement).getPropertyValue("--color-brand").trim();

  app.innerHTML =
    '<div class="visit">' +
    '<header class="visit-bar"><strong>' + L.brand + "</strong></header>" +
    '<main class="visit-body">' +
    '<p class="visit-kicker">' + L.kicker + "</p>" +
    '<h1 class="visit-title">' + L.brand + "</h1>" +
    '<p class="visit-lead">' + L.lead + "</p>" +
    '<div class="choice-list">' +
    '<a class="choice choice-shop" href="' + shopHref + '"><strong>' + L.chocolateTitle + "</strong><span>" + L.chocolateBody + "</span></a>" +
    '<a class="choice" href="marts.html"><strong>' + L.giftsTitle + "</strong><span>" + L.giftsBody + "</span></a>" +
    "</div></main></div>";
})();
