(function () {
  var L = window.SHE_LABELS;
  var catalog = window.SHE_CATALOG;
  var app = document.getElementById("app");
  var desktopQuery = window.matchMedia("(min-width: 960px)");

  document.title = isPlaceShop() ? L.store.name + " — " + L.placeMetaSuffix : L.metaTitle;
  var theme = document.querySelector('meta[name="theme-color"]');
  if (theme) {
    theme.content = getComputedStyle(document.documentElement).getPropertyValue("--color-brand").trim();
  }

  var state = {
    category: catalog.categories[0],
    query: "",
    searchOpen: false,
    selectedId: catalog.defaultId || catalog.products[0].id,
    pack: 1,
    qty: 1,
    slide: 0,
    detailOpen: false,
    cartOpen: false,
    checkoutOpen: false,
    success: null,
    accordion: "ingredients",
    cart: [],
    toast: "",
    pulsePacks: false,
    form: { name: "", phone: "", address: "", note: "" },
    formError: "",
    sending: false,
    keepDetailScroll: false,
    locating: false,
    userPos: null,
    locationNote: ""
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function isDesktop() {
    return desktopQuery.matches;
  }

  function productById(id) {
    return catalog.products.find(function (item) {
      return item.id === id;
    });
  }

  function money(amount) {
    if (amount == null) return L.contactPrice;
    return new Intl.NumberFormat("vi-VN").format(amount) + L.currency;
  }

  function packOf(product) {
    return product.packs ? state.pack : 1;
  }

  function unitTimes(product, pack) {
    if (product.price == null) return null;
    return product.price * pack;
  }

  function visibleProducts() {
    var query = state.query.trim().toLowerCase();
    return catalog.products.filter(function (product) {
      var inCategory = product.categories.indexOf(state.category) !== -1;
      if (!inCategory) return false;
      if (!query) return true;
      var copy = L.products[product.id];
      return (copy.name + " " + copy.menu + " " + copy.tasting).toLowerCase().indexOf(query) !== -1;
    });
  }

  function cartCount() {
    return state.cart.reduce(function (sum, line) {
      return sum + line.qty;
    }, 0);
  }

  function cartSummary() {
    var sum = 0;
    var priced = false;
    var contact = false;
    state.cart.forEach(function (line) {
      var product = productById(line.id);
      var amount = unitTimes(product, line.pack) ;
      if (amount == null) contact = true;
      else {
        priced = true;
        sum += amount * line.qty;
      }
    });
    return { sum: sum, priced: priced, contact: contact };
  }

  function icon(name) {
    var paths = {
      back: '<path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      search: '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      close: '<path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      bag: '<path d="M6 8h12l-1 11H7L6 8z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 8V7a3 3 0 0 1 6 0v1" fill="none" stroke="currentColor" stroke-width="1.6"/>',
      plus: '<path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      pin: '<path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="11" r="1.6" fill="currentColor"/>',
      bike: '<circle cx="7" cy="16" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="16" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 16h4l2-5h4M9 8h3l1.5 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      phone: '<path d="M8 5h2l1 4-2 1a12 12 0 0 0 5 5l1-2 4 1v2a2 2 0 0 1-2 2A14 14 0 0 1 6 7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
      shop: '<path d="M4 10h16v9H4zM3 10l2-4h14l2 4M9 19v-5h6v5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
    };
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' + paths[name] + "</svg>";
  }

  function art(product, slide) {
    var mark = esc(L.store.mark);
    var tone = "tone-" + product.tone;
    if (product.image && slide === 0) {
      var photoName = L.products[product.id] ? L.products[product.id].name : "";
      return '<img src="' + esc(product.image) + '" alt="' + esc(photoName) + '">';
    }
    if (slide === 1) {
      return (
        '<svg class="art ' + tone + '" viewBox="0 0 200 240" role="img">' +
        '<rect width="200" height="240" fill="transparent"/>' +
        '<circle cx="70" cy="120" r="28" fill="var(--color-cocoa)"/>' +
        '<circle cx="112" cy="108" r="24" fill="var(--art-body)"/>' +
        '<circle cx="132" cy="146" r="22" fill="var(--color-cocoa-deep)"/>' +
        '<circle cx="86" cy="156" r="18" fill="var(--art-accent)"/>' +
        '<rect x="62" y="186" width="76" height="22" rx="6" fill="var(--art-lid)"/>' +
        '<text x="100" y="201" text-anchor="middle" font-size="11" font-family="Be Vietnam Pro, sans-serif" font-weight="700" fill="var(--art-accent)">' +
        mark + "</text></svg>"
      );
    }
    if (product.art === "jar") {
      return (
        '<svg class="art ' + tone + '" viewBox="0 0 200 240" role="img">' +
        '<ellipse cx="100" cy="214" rx="46" ry="8" fill="rgba(0,0,0,.08)"/>' +
        '<rect x="78" y="36" width="44" height="16" rx="3" fill="var(--art-lid)"/>' +
        '<rect x="68" y="50" width="64" height="12" rx="3" fill="var(--art-accent)"/>' +
        '<path d="M60 78h80l-8 112a18 18 0 0 1-18 16H86a18 18 0 0 1-18-16L60 78z" fill="var(--art-body)"/>' +
        '<path d="M72 96h56l-4 78H78z" fill="rgba(255,255,255,.18)"/>' +
        '<rect x="74" y="118" width="52" height="36" rx="4" fill="var(--art-lid)"/>' +
        '<text x="100" y="140" text-anchor="middle" font-size="12" font-family="Be Vietnam Pro, sans-serif" font-weight="700" fill="var(--art-accent)">' +
        mark + "</text></svg>"
      );
    }
    if (product.art === "pouch") {
      return (
        '<svg class="art ' + tone + '" viewBox="0 0 200 240" role="img">' +
        '<ellipse cx="100" cy="214" rx="42" ry="8" fill="rgba(0,0,0,.08)"/>' +
        '<path d="M62 58h76l10 20v112a12 12 0 0 1-12 12H64a12 12 0 0 1-12-12V78l10-20z" fill="var(--art-body)"/>' +
        '<path d="M62 58h76l-8 16H70z" fill="var(--art-accent)"/>' +
        '<rect x="74" y="108" width="52" height="40" rx="4" fill="var(--art-lid)"/>' +
        '<text x="100" y="132" text-anchor="middle" font-size="12" font-family="Be Vietnam Pro, sans-serif" font-weight="700" fill="var(--art-accent)">' +
        mark + "</text></svg>"
      );
    }
    return (
      '<svg class="art ' + tone + '" viewBox="0 0 200 240" role="img">' +
      '<ellipse cx="100" cy="206" rx="58" ry="8" fill="rgba(0,0,0,.08)"/>' +
      '<rect x="48" y="78" width="104" height="112" rx="8" fill="var(--art-body)"/>' +
      '<path d="M48 98h104l-10 18H58z" fill="var(--art-accent)"/>' +
      '<rect x="70" y="124" width="60" height="36" rx="4" fill="var(--art-lid)"/>' +
      '<text x="100" y="146" text-anchor="middle" font-size="12" font-family="Be Vietnam Pro, sans-serif" font-weight="700" fill="var(--art-accent)">' +
      mark + "</text></svg>"
    );
  }

  function openProduct(id) {
    if (state.selectedId !== id) {
      state.selectedId = id;
      state.pack = 1;
      state.qty = 1;
      state.slide = 0;
      state.accordion = "ingredients";
    }
    state.detailOpen = !isDesktop();
    state.keepDetailScroll = false;
    state.cartOpen = false;
    state.checkoutOpen = false;
  }

  function addCurrent() {
    var product = productById(state.selectedId);
    var pack = packOf(product);
    var existing = state.cart.find(function (line) {
      return line.id === product.id && line.pack === pack;
    });
    if (existing) existing.qty += state.qty;
    else state.cart.push({ id: product.id, pack: pack, qty: state.qty, packs: product.packs });
    state.toast = L.itemAdded;
    state.qty = 1;
    if (!isDesktop()) state.detailOpen = false;
    window.setTimeout(function () {
      if (state.toast) {
        state.toast = "";
        render();
      }
    }, 1600);
  }

  function isPlaceShop() {
    return window.SHE_ORDER && window.SHE_ORDER.mode === "place";
  }

  function brandLogo(onBar) {
    if (isPlaceShop()) {
      return '<span class="brand-mark' + (onBar ? " brand-mark-on-bar" : "") + '">' + esc(L.store.mark) + "</span>";
    }
    return '<img class="brand-logo' + (onBar ? " brand-logo-on-bar" : "") + '" src="images/logo-she.png" alt="' + esc(L.store.name) + '">';
  }

  function mapsLink() {
    var place = window.VISIT_PLACE;
    var labels = window.VISIT_LABELS;
    if (!place || !place.mapsUrl || !labels) return "";
    return '<p class="muted"><a class="maps-link" href="' + esc(place.mapsUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(labels.directions) + "</a></p>";
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
    if (meters < 1000) return Math.round(meters) + " " + L.meterUnit;
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(meters / 1000) + " " + L.kmUnit;
  }

  function pickupPlaces(product) {
    var wanted = {};
    (product.stores || []).forEach(function (id) { wanted[id] = true; });
    var order = product.stores || [];
    return (window.SHE_STORES || []).filter(function (place) {
      return wanted[place.id] && (place.mapsUrl || (place.lat != null && place.lng != null));
    }).map(function (place) {
      var copy = {
        id: place.id,
        name: place.name,
        area: place.area,
        mapsUrl: place.mapsUrl || "",
        lat: place.lat,
        lng: place.lng,
        meters: null
      };
      if (state.userPos && place.lat != null && place.lng != null) copy.meters = distanceMeters(state.userPos, place);
      return copy;
    }).sort(function (a, b) {
      if (state.userPos && (a.meters != null || b.meters != null)) {
        if (a.meters == null) return 1;
        if (b.meters == null) return -1;
        return a.meters - b.meters;
      }
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
  }

  function storeHref(place) {
    if (state.userPos && place.lat != null && place.lng != null) {
      return "https://www.google.com/maps/dir/?api=1&origin=" + state.userPos.lat + "," + state.userPos.lng + "&destination=" + place.lat + "," + place.lng;
    }
    if (place.mapsUrl) return place.mapsUrl;
    return "https://www.google.com/maps/search/?api=1&query=" + place.lat + "," + place.lng;
  }

  function placeHref() {
    var place = window.SHE_PLACE || {};
    if (state.userPos && place.lat != null && place.lng != null) {
      return "https://www.google.com/maps/dir/?api=1&origin=" + state.userPos.lat + "," + state.userPos.lng + "&destination=" + place.lat + "," + place.lng;
    }
    if (place.mapsUrl) return place.mapsUrl;
    if (place.lat != null && place.lng != null) {
      return "https://www.google.com/maps/search/?api=1&query=" + place.lat + "," + place.lng;
    }
    return "";
  }

  function renderPlaceChannels() {
    var href = placeHref();
    var directions = window.VISIT_LABELS ? window.VISIT_LABELS.directions : "";
    var body =
      '<span class="channel-mark web"><span>' + esc(L.store.mark) + "</span></span>" +
      "<span><strong>" + esc(L.pickupTitle) + "</strong><span>" + esc(L.pickupBody) + "</span>" +
      (href ? "<em>" + esc(directions) + "</em>" : "") + "</span>";
    var place = href
      ? '<a class="channel" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + body + "</a>"
      : '<div class="channel">' + body + "</div>";
    return (
      '<div class="section-label"><strong>' + esc(L.channelsTitle) + "</strong><span>" + esc(L.placeChannelsLead) + "</span></div>" +
      '<div class="channels">' +
      '<button class="channel is-current" type="button" data-action="channel-web">' +
      '<span class="channel-mark web"><span>' + esc(L.store.mark) + "</span></span>" +
      "<span><strong>" + esc(L.channelWebName) + "</strong><span>" + esc(L.channelWebBody) + "</span><em>" + esc(L.channelWebBadge) + "</em></span></button>" +
      place +
      "</div><p class=\"aside\">" + esc(L.placeFreshNote) + "</p>"
    );
  }

  function renderChannels(product) {
    if (isPlaceShop()) return renderPlaceChannels();
    var places = pickupPlaces(product);
    var stores = places.length
      ? places.map(function (place, index) {
          var detail = esc(place.name);
          if (place.area) detail += " · " + esc(place.area);
          if (place.meters != null) detail += " · " + esc(L.distancePrefix) + " " + esc(formatDistance(place.meters));
          return (
            '<a class="channel" href="' + esc(storeHref(place)) + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="channel-mark web"><span>' + (index + 1) + "</span></span>" +
            "<span><strong>" + esc(L.storeSlot.replace("{n}", String(index + 1))) + "</strong><span>" + detail + "</span><em>" + esc(window.VISIT_LABELS ? window.VISIT_LABELS.directions : "") + "</em></span></a>"
          );
        }).join("")
      : '<p class="aside">' + esc(L.noStores) + "</p>";
    var near = state.locating ? L.locating : L.nearMe;
    return (
      '<div class="section-label"><strong>' + esc(L.channelsTitle) + "</strong><span>" + esc(L.channelsLead) + "</span></div>" +
      '<div class="channels">' +
      '<button class="channel is-current" type="button" data-action="channel-web">' +
      '<span class="channel-mark web">' + (isPlaceShop() ? "<span>" + esc(L.store.mark) + "</span>" : '<img src="images/logo-she.png" alt="' + esc(L.store.name) + '">') + "</span>" +
      "<span><strong>" + esc(L.channelWebName) + "</strong><span>" + esc(L.channelWebBody) + "</span><em>" + esc(L.channelWebBadge) + "</em></span></button>" +
      stores +
      "</div>" +
      (places.length
        ? '<button class="near-btn" type="button" data-action="near"' + (state.locating ? " disabled" : "") + ">" + esc(near) + "</button>"
        : "") +
      (state.locationNote ? '<p class="aside">' + esc(state.locationNote) + "</p>" : "") +
      (state.userPos && places.length && !places.some(function (place) { return place.meters != null; })
        ? '<p class="aside">' + esc(L.locationNoCoords) + "</p>"
        : "") +
      '<p class="aside">' + esc(L.freshNote) + "</p>"
    );
  }

  function renderHeader() {
    var count = cartCount();
    var search = state.searchOpen
      ? '<input id="search" class="search-input" type="search" placeholder="' + esc(L.header.searchPlaceholder) + '" value="' + esc(state.query) + '" />'
      : '<h1 class="topbar-title">' + brandLogo(true) + "</h1>";
    return (
      '<header class="topbar">' +
      '<button class="icon-btn" type="button" data-action="back" aria-label="' + esc(L.header.back) + '">' + icon("back") + "</button>" +
      search +
      '<button class="icon-btn" type="button" data-action="search" aria-label="' + esc(state.searchOpen ? L.header.clearSearch : L.header.search) + '">' +
      icon(state.searchOpen ? "close" : "search") + "</button>" +
      '<button class="icon-btn" type="button" data-action="cart" aria-label="' + esc(L.header.cart) + '">' +
      icon("bag") + (count ? '<span class="badge">' + count + "</span>" : "") + "</button></header>"
    );
  }

  function renderStore() {
    return (
      '<div class="cover"></div><section class="store-card">' +
      '<div class="logo">' + brandLogo(false) + "</div>" +
      "<h2 class=\"store-name\">" + esc(L.store.name) + "</h2>" +
      '<p class="muted">' + esc(L.store.kind) + " · " + esc(L.store.area) + "</p>" +
      '<p class="muted">' + esc(L.store.delivery) + " · " + esc(L.store.fee) + "</p>" +
      '<p class="muted">' + esc(L.store.hours) + "</p>" +
      mapsLink() +
      '<div class="promos">' +
      '<div class="promo"><strong>' + esc(L.store.promoShipTitle) + "</strong><span>" + esc(L.store.promoShipBody) + "</span></div>" +
      '<div class="promo"><strong>' + esc(L.store.promoPackTitle) + "</strong><span>" + esc(L.store.promoPackBody) + "</span></div>" +
      "</div></section>"
    );
  }

  function renderMenu() {
    var tabs = catalog.categories.map(function (id) {
      var active = id === state.category ? " is-active" : "";
      return '<button class="tab' + active + '" type="button" data-action="category" data-id="' + esc(id) + '">' + esc(L.categories[id]) + "</button>";
    }).join("");
    var items = visibleProducts();
    var list = items.length
      ? items.map(function (product) {
          var copy = L.products[product.id];
          var active = product.id === state.selectedId ? " is-active" : "";
          return (
            '<button class="menu-item' + active + '" type="button" data-action="open" data-id="' + esc(product.id) + '">' +
            '<span class="menu-copy"><span class="menu-name">' + esc(copy.name) + "</span>" +
            '<span class="menu-desc">' + esc(copy.menu) + "</span>" +
            '<span class="menu-price">' + esc(money(product.price)) + "</span></span>" +
            '<span class="thumb">' + art(product, 0) + '<span class="plus">' + icon("plus") + "</span></span></button>"
          );
        }).join("")
      : '<p class="empty-menu">' + esc(L.emptyMenu) + "</p>";
    return '<div class="menu-col"><div class="tabs">' + tabs + "</div>" + list + "</div>";
  }

  function renderPacks(product) {
    if (!product.packs) return "";
    var buttons = [1, 3, 6].map(function (count) {
      var selected = state.pack === count ? " is-selected" : "";
      var amount = unitTimes(product, count);
      return (
        '<button class="pack' + selected + '" type="button" role="radio" aria-checked="' + (state.pack === count) + '" data-action="pack" data-pack="' + count + '">' +
        '<span class="pack-name">' + esc(L.packs[count]) + "</span>" +
        '<span class="pack-price">' + esc(money(amount)) + "</span></button>"
      );
    }).join("");
    return (
      '<div class="section-label"><strong>' + esc(L.packsTitle) + "</strong><span>" + esc(L.packsHint) + "</span></div>" +
      '<div id="packs" class="packs' + (state.pulsePacks ? " is-pulse" : "") + '" role="radiogroup" aria-label="' + esc(L.packsTitle) + '">' +
      buttons + "</div>"
    );
  }

  function renderFacts() {
    return (
      '<div class="facts">' +
      '<div class="fact"><span class="dot-live"></span><p><strong>' + esc(L.availabilityTitle) + "</strong><br><small>" + esc(L.availabilityAction) + "</small></p><span></span></div>" +
      '<div class="fact">' + icon("bike") + "<p><strong>" + esc(L.deliveryTitle) + "</strong><br><small>" + esc(L.deliveryBody) + "</small><br><small>" + esc(L.deliveryNote) + "</small></p><small>" + esc(L.deliveryPrice) + "</small></div>" +
      '<div class="fact">' + icon("pin") + "<p><strong>" + esc(L.pickupTitle) + "</strong><br><small>" + esc(L.pickupBody) + "</small></p><span></span></div>" +
      '<div class="fact">' + icon("phone") + "<p><strong>" + esc(L.serviceTitle) + "</strong><br><small>" + esc(L.serviceBody) + "</small></p><span></span></div>" +
      "</div>"
    );
  }

  function renderAccordion(copy) {
    function block(id, title, body) {
      var open = state.accordion === id;
      return (
        '<div class="accordion"><button class="accordion-btn" type="button" data-action="accordion" data-id="' + id + '" aria-expanded="' + open + '">' +
        esc(title) + "<span>" + (open ? "–" : "+") + "</span></button>" +
        (open ? '<div class="accordion-panel">' + body + "</div>" : "") + "</div>"
      );
    }
    var ingredients = copy.ingredients.map(function (line) {
      return "<p>" + esc(line) + "</p>";
    }).join("");
    var specs = copy.specs.map(function (line) {
      return "<p>" + esc(line) + "</p>";
    }).join("");
    var faq = L.faq.map(function (item) {
      return '<div class="faq-item"><strong>' + esc(item.q) + "</strong><p>" + esc(item.a) + "</p></div>";
    }).join("");
    return (
      block("ingredients", L.accordion.ingredients, ingredients) +
      block("specs", L.accordion.specs, specs) +
      block("faq", L.accordion.faq, faq)
    );
  }

  function renderRecommend(product) {
    var others = catalog.products.filter(function (item) {
      return item.id !== product.id && item.categories.some(function (cat) {
        return product.categories.indexOf(cat) !== -1;
      });
    }).slice(0, 4);
    if (!others.length) return "";
    var cards = others.map(function (item) {
      var copy = L.products[item.id];
      return (
        '<button class="rec" type="button" data-action="open" data-id="' + esc(item.id) + '">' +
        '<span class="thumb">' + art(item, 0) + "</span><strong>" + esc(copy.name) + "</strong><span>" + esc(money(item.price)) + "</span></button>"
      );
    }).join("");
    return '<section class="recommend"><h2>' + esc(L.recommendTitle) + '</h2><div class="recommend-row">' + cards + "</div></section>";
  }

  function renderDetail() {
    var product = productById(state.selectedId);
    var copy = L.products[product.id];
    var pack = packOf(product);
    var total = unitTimes(product, pack);
    if (total != null) total *= state.qty;
    var openClass = state.detailOpen || isDesktop() ? " is-open" : "";
    var dots = product.image ? "" : [0, 1].map(function (index) {
      return '<button class="dot' + (state.slide === index ? " is-active" : "") + '" type="button" data-action="slide" data-slide="' + index + '" aria-label="' + esc(L.slides[index]) + '"></button>';
    }).join("");
    return (
      '<section class="detail-layer' + openClass + '" ' + (state.detailOpen ? 'role="dialog" aria-modal="true"' : "") + ">" +
      '<div class="detail-top"><button class="icon-btn" type="button" data-action="close-detail" aria-label="' + esc(L.close) + '">' + icon("close") + "</button></div>" +
      '<div class="detail-body"><div class="detail-hero"><div class="stage-wrap"><div class="stage">' + art(product, state.slide) + '</div><div class="dots">' + dots + "</div></div>" +
      "<div><h2 class=\"detail-title\">" + esc(copy.name) + "</h2>" +
      '<p class="detail-price">' + esc(money(product.price)) + "</p>" +
      '<p class="muted">' + esc(L.taxIncluded) + "</p>" +
      '<p class="muted">' + esc(copy.tasting) + "</p>" +
      renderPacks(product) +
      '<div class="section-label"><strong>' + esc(L.qty) + "</strong></div>" +
      '<div class="stepper"><button type="button" data-action="qty" data-dir="-1" aria-label="' + esc(L.decrease) + '">–</button><strong>' + state.qty + "</strong>" +
      '<button type="button" data-action="qty" data-dir="1" aria-label="' + esc(L.increase) + '">+</button></div>' +
      '<div class="sticky-buy"><button class="add-btn" type="button" data-action="add"><span>' + esc(L.addToCart) + "</span><span>" + esc(money(total)) + "</span></button></div>" +
      "</div></div>" +
      renderFacts() + renderChannels(product) +
      (isPlaceShop() ? "" :
        '<div class="section-label"><strong>' + esc(L.pillarsTitle) + "</strong></div>" +
        '<div class="pillars">' + L.pillars.map(function (item) {
          return '<article class="pillar"><h3>' + esc(item.title) + "</h3><p>" + esc(item.body) + "</p></article>";
        }).join("") + "</div>") +
      renderAccordion(copy) + renderRecommend(product) + "</div></section>"
    );
  }

  function renderCartBar() {
    if (!state.cart.length || (state.detailOpen && !isDesktop())) return "";
    var summary = cartSummary();
    var price = summary.priced ? money(summary.sum) : L.contactPrice;
    return (
      '<div class="cart-bar"><button type="button" data-action="cart"><span>' + esc(L.viewCart) + " · " + cartCount() + "</span><span>" + esc(price) + "</span></button></div>"
    );
  }

  function renderCartSheet() {
    if (!state.cartOpen && !state.checkoutOpen && !state.success) return "";
    var body = "";
    if (state.success) {
      body =
        "<h2>" + esc(L.successTitle) + "</h2><p>" + esc(L.successBody) + "</p><p>" + esc(state.success) + "</p>" +
        '<button class="primary" type="button" data-action="done">' + esc(L.successDone) + "</button>";
    } else if (state.checkoutOpen) {
      body =
        "<h2>" + esc(L.checkoutTitle) + "</h2>" +
        '<label class="field">' + esc(L.fieldName) + '<input id="field-name" value="' + esc(state.form.name) + '" data-field="name"></label>' +
        '<label class="field">' + esc(L.fieldPhone) + '<input id="field-phone" inputmode="tel" value="' + esc(state.form.phone) + '" data-field="phone"></label>' +
        '<label class="field">' + esc(L.fieldAddress) + '<input id="field-address" value="' + esc(state.form.address) + '" data-field="address"></label>' +
        '<label class="field">' + esc(L.fieldNote) + '<textarea id="field-note" placeholder="' + esc(L.fieldNotePlaceholder) + '" data-field="note">' + esc(state.form.note) + "</textarea></label>" +
        (state.formError ? '<p class="form-error">' + esc(state.formError) + "</p>" : "") +
        '<button class="primary" type="button" data-action="place"' + (state.sending ? " disabled" : "") + ">" + esc(state.sending ? L.orderSending : L.placeOrder) + "</button>";
    } else if (!state.cart.length) {
      body = "<h2>" + esc(L.cartTitle) + "</h2><p>" + esc(L.cartEmpty) + "</p>";
    } else {
      var summary = cartSummary();
      var lines = state.cart.map(function (line, index) {
        var product = productById(line.id);
        var copy = L.products[line.id];
        var amount = unitTimes(product, line.pack);
        var shown = amount == null ? L.contactPrice : money(amount * line.qty);
        var packLabel = line.packs ? line.pack + " " + L.cartPack : "";
        return (
          '<div class="cart-line"><div><strong>' + esc(copy.name) + "</strong><p class=\"muted\">" + esc(packLabel) + "</p></div>" +
          '<div class="line-actions"><div class="stepper"><button type="button" data-action="line-qty" data-index="' + index + '" data-dir="-1" aria-label="' + esc(L.decrease) + '">–</button><strong>' + line.qty + "</strong>" +
          '<button type="button" data-action="line-qty" data-index="' + index + '" data-dir="1" aria-label="' + esc(L.increase) + '">+</button></div>' +
          "<strong>" + esc(shown) + '</strong><button class="text-btn" type="button" data-action="remove" data-index="' + index + '">' + esc(L.cartRemove) + "</button></div></div>"
        );
      }).join("");
      body =
        "<h2>" + esc(L.cartTitle) + "</h2>" + lines +
        (summary.contact ? '<p class="aside">' + esc(L.cartContactNote) + "</p>" : "") +
        '<div class="totals"><span>' + esc(L.cartSubtotal) + "</span><span>" + esc(summary.priced ? money(summary.sum) : L.contactPrice) + "</span></div>" +
        '<button class="primary" type="button" data-action="checkout">' + esc(L.checkout) + "</button>";
    }
    return (
      '<div class="overlay" data-action="overlay"><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(L.cartTitle) + '"><div class="handle"></div>' +
      '<div class="sheet-head"><span></span><button class="icon-btn" type="button" data-action="close-sheet" aria-label="' + esc(L.close) + '">' + icon("close") + "</button></div>" +
      body + "</div></div>"
    );
  }

  function render() {
    var menuCol = document.querySelector(".menu-col");
    var detail = document.querySelector(".detail-layer");
    var menuScroll = menuCol ? menuCol.scrollTop : 0;
    var detailScroll = detail ? detail.scrollTop : 0;
    var active = document.activeElement;
    var activeId = active && active.id ? active.id : "";
    var selection = active && typeof active.selectionStart === "number" ? active.selectionStart : null;

    app.innerHTML =
      '<div class="app' + (state.cart.length ? " has-cart" : "") + '">' + renderHeader() + renderStore() + '<div class="workspace">' + renderMenu() + renderDetail() + "</div></div>" +
      renderCartBar() + renderCartSheet() +
      (state.toast ? '<div class="toast" role="status">' + esc(state.toast) + "</div>" : "");

    var nextMenu = document.querySelector(".menu-col");
    var nextDetail = document.querySelector(".detail-layer");
    if (nextMenu) nextMenu.scrollTop = menuScroll;
    if (nextDetail) nextDetail.scrollTop = state.keepDetailScroll ? detailScroll : 0;
    state.keepDetailScroll = true;

    if (activeId) {
      var field = document.getElementById(activeId);
      if (field) {
        field.focus();
        if (selection != null && field.setSelectionRange) {
          try { field.setSelectionRange(selection, selection); } catch (error) { /* search inputs can reject a range */ }
        }
      }
    }
  }

  app.addEventListener("click", function (event) {
    var target = event.target.closest("[data-action]");
    if (!target || !app.contains(target)) return;
    var action = target.getAttribute("data-action");
    if (action === "overlay" && event.target !== target) return;

    if (action === "back") {
      if (state.detailOpen && !isDesktop()) state.detailOpen = false;
      else if (state.searchOpen) {
        state.searchOpen = false;
        state.query = "";
      } else {
        var from = new URLSearchParams(window.location.search).get("from");
        window.location.href = from === "home" ? "/" : "/marts.html";
        return;
      }
    } else if (action === "search") {
      state.searchOpen = !state.searchOpen;
      if (!state.searchOpen) state.query = "";
    } else if (action === "category") {
      state.category = target.getAttribute("data-id");
    } else if (action === "open") {
      openProduct(target.getAttribute("data-id"));
    } else if (action === "close-detail") {
      state.detailOpen = false;
    } else if (action === "pack") {
      state.pack = Number(target.getAttribute("data-pack"));
      state.pulsePacks = false;
    } else if (action === "slide") {
      state.slide = Number(target.getAttribute("data-slide"));
    } else if (action === "qty") {
      state.qty = Math.min(20, Math.max(1, state.qty + Number(target.getAttribute("data-dir"))));
    } else if (action === "add") {
      addCurrent();
    } else if (action === "channel-web") {
      state.pulsePacks = true;
      state.detailOpen = !isDesktop() ? true : state.detailOpen;
      render();
      var packs = document.getElementById("packs") || document.querySelector(".add-btn");
      if (packs) packs.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    } else if (action === "near") {
      if (state.locating) return;
      if (!navigator.geolocation) {
        state.locationNote = L.locationDenied;
      } else {
        state.locating = true;
        state.locationNote = "";
        navigator.geolocation.getCurrentPosition(function (position) {
          state.locating = false;
          state.userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
          state.locationNote = "";
          render();
        }, function () {
          state.locating = false;
          state.locationNote = L.locationDenied;
          render();
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
      }
    } else if (action === "accordion") {
      var id = target.getAttribute("data-id");
      state.accordion = state.accordion === id ? "" : id;
    } else if (action === "cart") {
      state.cartOpen = true;
      state.checkoutOpen = false;
      state.success = null;
    } else if (action === "close-sheet" || action === "overlay") {
      state.cartOpen = false;
      state.checkoutOpen = false;
      state.success = null;
    } else if (action === "line-qty") {
      var line = state.cart[Number(target.getAttribute("data-index"))];
      line.qty = Math.min(20, Math.max(1, line.qty + Number(target.getAttribute("data-dir"))));
    } else if (action === "remove") {
      state.cart.splice(Number(target.getAttribute("data-index")), 1);
    } else if (action === "checkout") {
      state.checkoutOpen = true;
      state.formError = "";
    } else if (action === "place") {
      if (state.sending) return;
      var phone = state.form.phone.replace(/\D/g, "");
      if (!state.form.name.trim() || !phone || !state.form.address.trim()) state.formError = L.required;
      else if (!/^\d{9,11}$/.test(phone)) state.formError = L.phoneInvalid;
      else {
        var summary = cartSummary();
        var summaryText = state.cart.map(function (line) {
          var name = L.products[line.id].name;
          var packLabel = line.packs ? " · " + L.packs[line.pack] : "";
          return name + packLabel + " × " + line.qty;
        }).join(" · ");
        if (summary.priced) summaryText += " · " + money(summary.sum);
        var payload = {
          name: state.form.name.trim(),
          phone: phone,
          address: state.form.address.trim(),
          note: state.form.note.trim(),
          items: state.cart.map(function (line) {
            var product = productById(line.id);
            var amount = unitTimes(product, line.pack);
            return {
              id: line.id,
              name: L.products[line.id].name,
              packLabel: line.packs ? L.packs[line.pack] : "",
              qty: line.qty,
              lineText: amount == null ? L.contactPrice : money(amount * line.qty)
            };
          }),
          totalText: summary.priced ? money(summary.sum) : L.contactPrice
        };
        var webhook = window.SHE_ORDER && window.SHE_ORDER.webhookUrl;
        function acceptOrder() {
          state.sending = false;
          state.success = summaryText;
          state.cart = [];
          state.cartOpen = false;
          state.checkoutOpen = false;
          state.form = { name: "", phone: "", address: "", note: "" };
          render();
        }
        if (!webhook) {
          acceptOrder();
          return;
        }
        state.sending = true;
        state.formError = "";
        render();
        fetch(webhook, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify(payload)
        }).then(acceptOrder).catch(function () {
          state.sending = false;
          state.formError = L.orderSendFailed;
          render();
        });
        return;
      }
    } else if (action === "done") {
      state.success = null;
    }
    render();
    if (action === "search" && state.searchOpen) {
      var searchBox = document.getElementById("search");
      if (searchBox) searchBox.focus();
    }
  });

  app.addEventListener("input", function (event) {
    var field = event.target;
    if (field.id === "search") {
      state.query = field.value;
      render();
      return;
    }
    if (field.getAttribute("data-field")) {
      state.form[field.getAttribute("data-field")] = field.value;
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (state.success || state.checkoutOpen || state.cartOpen) {
      state.success = null;
      state.checkoutOpen = false;
      state.cartOpen = false;
      render();
    } else if (state.detailOpen && !isDesktop()) {
      state.detailOpen = false;
      render();
    }
  });

  desktopQuery.addEventListener("change", render);
  render();
})();
