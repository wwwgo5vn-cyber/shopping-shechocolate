var fs = require("fs");
var path = require("path");
var https = require("https");
var ExcelJS = require("exceljs");
var limits = require("./limits");

var root = path.join(__dirname, "..");
var sourceNote = "Lọc từ file điểm bán kênh du lịch, chỉ cửa hàng có địa điểm tại Đà Nẵng. Món trong gian hàng là dữ liệu demo.";

var stores = [
  {
    id: "lavien-chocolate",
    name: "LAVIE'N Chocolate",
    mark: "LN",
    kind: "Cửa hàng sô-cô-la",
    area: "An Hải, Đà Nẵng",
    summary: "Sô-cô-la tại 106 Hồ Nghinh, An Hải.",
    tags: "food",
    address: "106 Hồ Nghinh, phường An Hải, Đà Nẵng",
    query: "106 Hồ Nghinh, An Hải, Đà Nẵng",
    products: [
      ["thanh-socola-demo", "Demo · Thanh sô-cô-la", 79000, "box", "coffee"],
      ["hop-socola-demo", "Demo · Hộp sô-cô-la", 149000, "box", "gift"]
    ]
  },
  {
    id: "dong-market",
    name: "Đông Market",
    mark: "DM",
    kind: "Cửa hàng",
    area: "Sơn Trà, Đà Nẵng",
    summary: "Cửa hàng tại 80 Dương Tự Minh, Sơn Trà.",
    tags: "food",
    address: "80 Dương Tự Minh, Sơn Trà, Đà Nẵng",
    query: "80 Dương Tự Minh, Sơn Trà, Đà Nẵng",
    products: [
      ["gio-qua-demo", "Demo · Giỏ quà nhỏ", 89000, "box", "gift"],
      ["dac-san-demo", "Demo · Hộp đặc sản", 159000, "pouch", "fruit"]
    ]
  },
  {
    id: "phuc-linh",
    name: "Phúc Linh",
    mark: "PL",
    kind: "Cửa hàng sân bay",
    area: "Hòa Cường, Đà Nẵng",
    summary: "Điểm bán tại sân bay quốc tế Đà Nẵng.",
    tags: "experience",
    address: "Tầng 2 khu cách ly, sân bay quốc tế Đà Nẵng, Hòa Cường",
    query: "Sân bay quốc tế Đà Nẵng",
    products: [
      ["qua-san-bay-demo", "Demo · Quà sân bay", 99000, "box", "luxury"],
      ["hop-qua-demo", "Demo · Hộp quà nhỏ", 129000, "box", "moon"]
    ]
  },
  {
    id: "vini-mart",
    name: "Minimart Vini",
    mark: "MV",
    kind: "Minimart",
    area: "Hội An, Đà Nẵng",
    summary: "Cửa hàng tại 37 Nguyễn Phúc Chu, Hội An.",
    tags: "food",
    address: "37 Nguyễn Phúc Chu, phường Hội An, Đà Nẵng",
    query: "37 Nguyễn Phúc Chu, Hội An, Đà Nẵng",
    products: [
      ["do-an-demo", "Demo · Đồ ăn nhẹ", 45000, "pouch", "banana"],
      ["gio-minimart-demo", "Demo · Giỏ minimart", 119000, "box", "coconut"]
    ]
  },
  {
    id: "deli-mart",
    name: "Deli Mart",
    mark: "DL",
    kind: "Cửa hàng sân bay",
    area: "Hòa Cường, Đà Nẵng",
    summary: "Điểm bán tại ga quốc nội, sân bay Đà Nẵng.",
    tags: "food",
    address: "Ga quốc nội, sân bay quốc tế Đà Nẵng",
    query: "Ga quốc nội sân bay quốc tế Đà Nẵng",
    products: [
      ["suat-an-demo", "Demo · Suất ăn nhẹ", 69000, "box", "fruit"],
      ["combo-san-bay-demo", "Demo · Combo sân bay", 139000, "box", "coffee"]
    ]
  },
  {
    id: "vigift",
    name: "Vigift - Đặc Sản Quà Đà Nẵng",
    mark: "VG",
    kind: "Quà đặc sản",
    area: "An Hải, Đà Nẵng",
    summary: "Đặc sản quà Đà Nẵng, 72 Võ Văn Kiệt, An Hải.",
    tags: "food,handicraft",
    address: "72 Võ Văn Kiệt, phường An Hải, Đà Nẵng",
    query: "72 Võ Văn Kiệt, An Hải, Đà Nẵng",
    products: [
      ["dac-san-vung-demo", "Demo · Đặc sản vùng", 99000, "jar", "cashew"],
      ["hop-qua-tang-demo", "Demo · Hộp quà tặng", 189000, "box", "luxury"]
    ]
  }
];

var selling = {
  "hat-phu-socola-hop-60g": ["lavien-chocolate", "dong-market", "vigift"],
  "hat-phu-socola-hop-120g": ["vigift", "phuc-linh", "deli-mart"],
  "trai-cay-nhung-socola-hop-60g": ["vini-mart", "dong-market"],
  "trai-cay-nhung-socola-hop-120g": ["deli-mart", "phuc-linh"],
  "xoai-hu-thuy-tinh-120g": ["lavien-chocolate", "vini-mart"],
  "cam-hu-thuy-tinh-100g": ["vigift"],
  "hat-dieu-hu-thuy-tinh-100g": ["dong-market", "vigift"],
  "macca-hu-thuy-tinh-100g": ["phuc-linh", "deli-mart"],
  "hat-sen-hu-thuy-tinh-90g": ["lavien-chocolate", "vini-mart", "dong-market"]
};

function chars(value) {
  return Array.from(String(value || "")).length;
}

function cellString(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value.text) return String(value.text).trim();
    if (value.result != null) return cellString(value.result);
    if (Array.isArray(value.richText)) return value.richText.map(function (part) { return part.text; }).join("").trim();
  }
  return String(value).trim();
}

function assertLimit(label, value, max) {
  var count = chars(value);
  if (count > max) throw new Error(label + " dài " + count + ", tối đa " + max + ": " + value);
}

function geocode(query) {
  return new Promise(function (resolve) {
    var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&q=" + encodeURIComponent(query);
    var request = https.get(url, { headers: { "User-Agent": "visit-danang-demo/1.0" } }, function (response) {
      var body = "";
      response.on("data", function (chunk) { body += chunk; });
      response.on("end", function () {
        try {
          var rows = JSON.parse(body);
          if (!rows[0]) return resolve(null);
          var lat = Number(rows[0].lat);
          var lng = Number(rows[0].lon);
          if (lat < 15.5 || lat > 16.6 || lng < 107.8 || lng > 108.6) return resolve(null);
          resolve({ lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 });
        } catch (error) {
          resolve(null);
        }
      });
    });
    request.on("error", function () { resolve(null); });
  });
}

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function headerRow(sheet, labels) {
  var row = sheet.addRow(labels);
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri" };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3C2415" } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 22;
}

function noteRow(sheet, values) {
  var row = sheet.addRow(values);
  row.font = { italic: true, color: { argb: "FF6D6D6D" }, name: "Calibri" };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F1E6" } };
  row.alignment = { vertical: "top", wrapText: true };
  row.height = 48;
}

function shopContent(store) {
  var maps = store.lat != null
    ? "https://www.google.com/maps/search/?api=1&query=" + store.lat + "," + store.lng
    : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(store.query);
  return {
    name: store.name,
    mark: store.mark,
    kind: store.kind,
    area: store.area,
    delivery: "Đặt trên trang này, nhân viên gọi xác nhận.",
    fee: "Phí giao báo khi xác nhận đơn.",
    hours: "Liên hệ cửa hàng để xác nhận.",
    promoShipTitle: "Giao tận nơi",
    promoShipBody: "Nhân viên gọi xác nhận",
    promoPackTitle: "Đến cửa hàng",
    promoPackBody: "Một địa chỉ, mở đường",
    link_shopee: "",
    url_nhan_don: "",
    detailStockTitle: "Đang bán tại cửa hàng",
    detailStockPlace: store.area,
    detailShipTitle: "Giao tận nơi",
    detailShipBody: "Nhân viên gọi xác nhận rồi giao.",
    detailShipPrice: "Theo địa chỉ",
    detailShipNote: "Phí giao báo khi xác nhận đơn.",
    detailPickupTitle: "Đến cửa hàng",
    detailPickupBody: store.address,
    detailServiceTitle: "Liên hệ cửa hàng",
    detailServiceBody: "Đang cập nhật",
    maps: maps,
    vi_do: store.lat != null ? String(store.lat) : "",
    kinh_do: store.lng != null ? String(store.lng) : ""
  };
}

async function writeShop(store) {
  var content = shopContent(store);
  limits.STORE_FIELDS.concat(limits.PLACE_FIELDS).forEach(function (field) {
    var max = limits.LIMITS.store[field[0]];
    if (max) assertLimit(store.id + " " + field[0], content[field[0]], max);
  });
  assertLimit(store.id + " summary", store.summary, limits.LIMITS.mart.summary);

  var workbook = new ExcelJS.Workbook();
  workbook.creator = "Visit Da Nang demo";
  var guide = workbook.addWorksheet("Hướng dẫn");
  guide.columns = [{ width: 28 }, { width: 110 }];
  [
    ["Mục", "Cách làm"],
    ["Dữ liệu này", sourceNote],
    ["Sau khi sửa", "npm run shop -- " + store.id],
    ["Địa chỉ", "Mã detailPickupBody. Trang một cửa hàng hiện đúng địa chỉ này và nút dẫn đường."]
  ].forEach(function (pair, index) {
    var row = guide.addRow(pair);
    row.alignment = { vertical: "top", wrapText: true };
    if (index === 0) {
      row.font = { bold: true, color: { argb: "FFFFFFFF" } };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3C2415" } };
    }
  });

  var sheet = workbook.addWorksheet("Cửa hàng");
  sheet.columns = [{ width: 28 }, { width: 78 }, { width: 42 }];
  headerRow(sheet, ["Mã", "Nội dung", "Giới hạn"]);
  noteRow(sheet, ["GHI_CHU", "Dòng này không phải dữ liệu.", "Generator bỏ qua."]);
  limits.STORE_FIELDS.concat(limits.PLACE_FIELDS).forEach(function (field) {
    sheet.addRow([field[0], content[field[0]], field[1]]);
  });

  var categories = workbook.addWorksheet("Danh mục");
  categories.columns = [{ width: 18 }, { width: 28 }, { width: 14 }];
  headerRow(categories, ["Mã", "Tên hiển thị", "Thứ tự"]);
  noteRow(categories, ["GHI_CHU", "Tên tab.", "Số nhỏ hiện trước."]);
  categories.addRow(["qua", "Quà demo", 1]);

  var products = workbook.addWorksheet("Sản phẩm");
  products.columns = limits.PRODUCT_COLUMNS.map(function () { return { width: 28 }; });
  headerRow(products, limits.PRODUCT_COLUMNS.map(function (column) { return column[1]; }));
  noteRow(products, ["GHI_CHU"].concat(limits.PRODUCT_COLUMNS.slice(1).map(function (column) { return column[2]; })));
  store.products.forEach(function (item) {
    var row = {
      ma: item[0],
      ten: item[1],
      mo_ta_ngan: "Dữ liệu demo để xem cách đặt hàng.",
      mo_ta_vi: "Món và giá này chỉ để trình bày chức năng. Sẽ thay bằng dữ liệu thật.",
      gia: item[2],
      goi: "có",
      danh_muc: "qua",
      anh: "",
      shopee: "",
      thanh_phan: "Thành phần sẽ ghi theo bao bì thật.",
      quy_cach: "Quy cách demo, chưa phải hàng thật.",
      kieu_hinh: item[3],
      mau: item[4],
      ban_tai: ""
    };
    assertLimit(item[0] + " tên", row.ten, limits.LIMITS.product.name);
    assertLimit(item[0] + " mô tả", row.mo_ta_ngan, limits.LIMITS.product.menu);
    assertLimit(item[0] + " vị", row.mo_ta_vi, limits.LIMITS.product.tasting);
    products.addRow(limits.PRODUCT_COLUMNS.map(function (column) { return row[column[0]]; }));
  });

  var faq = workbook.addWorksheet("Câu hỏi");
  faq.columns = [{ width: 52 }, { width: 88 }];
  headerRow(faq, ["Câu hỏi", "Trả lời"]);
  noteRow(faq, ["GHI_CHU", "Câu trả lời hiện ở trang chi tiết."]);
  faq.addRow(["Trang này đang dùng dữ liệu gì?", "Địa chỉ lấy từ danh sách điểm bán tại Đà Nẵng. Món và giá là demo để xem đặt giao tận nơi và nút dẫn đường."]);

  var file = path.join(root, "data", "shops", store.id + ".xlsx");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await workbook.xlsx.writeFile(file);
  console.log("Đã ghi data/shops/" + store.id + ".xlsx");
}

async function upsertMarts() {
  var file = path.join(root, "data", "marts.xlsx");
  var workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  var sheet = workbook.getWorksheet("Danh sách");
  var header = {};
  sheet.getRow(1).eachCell(function (cell, columnNumber) {
    header[cellString(cell.value)] = columnNumber;
  });
  stores.forEach(function (store) {
    var maps = store.lat != null
      ? "https://www.google.com/maps/search/?api=1&query=" + store.lat + "," + store.lng
      : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(store.query);
    var values = {
      "Mã": store.id,
      "Tên": store.name,
      "Khu vực": store.area,
      "Mô tả": store.summary,
      "Danh mục": store.tags,
      "Có gian hàng": "có",
      "Google Maps": maps,
      "Vĩ độ": store.lat != null ? store.lat : "",
      "Kinh độ": store.lng != null ? store.lng : "",
      "File dữ liệu gian hàng": "stores/" + store.id + "/generated-store.js",
      "File catalog": "stores/" + store.id + "/catalog.js"
    };
    var found = null;
    sheet.eachRow(function (row, rowNumber) {
      if (rowNumber > 1 && cellString(row.getCell(header["Mã"]).value) === store.id) found = row;
    });
    var row = found || sheet.addRow([]);
    Object.keys(values).forEach(function (label) {
      if (!header[label]) return;
      row.getCell(header[label]).value = values[label];
    });
  });
  await workbook.xlsx.writeFile(file);
  console.log("Đã cập nhật data/marts.xlsx");
}

async function updateSheOutlets() {
  var file = path.join(root, "data", "gian-hang.xlsx");
  var workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  var sheet = workbook.getWorksheet("Điểm bán");
  if (!sheet) throw new Error("gian-hang.xlsx thiếu sheet Điểm bán.");
  var ids = {};
  stores.forEach(function (store) { ids[store.id] = true; });
  var drop = [];
  sheet.eachRow(function (row, rowNumber) {
    if (ids[cellString(row.getCell(1).value)]) drop.push(rowNumber);
  });
  drop.reverse().forEach(function (rowNumber) { sheet.spliceRows(rowNumber, 1); });
  stores.forEach(function (store) {
    var maps = store.lat != null
      ? "https://www.google.com/maps/search/?api=1&query=" + store.lat + "," + store.lng
      : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(store.query);
    sheet.addRow([
      store.id,
      store.name,
      store.area,
      maps,
      store.lat != null ? store.lat : "",
      store.lng != null ? store.lng : ""
    ]);
  });

  var products = workbook.getWorksheet("Sản phẩm");
  var header = {};
  products.getRow(1).eachCell(function (cell, columnNumber) {
    header[cellString(cell.value)] = columnNumber;
  });
  if (!header["Mã"] || !header["Bán tại"]) throw new Error("Sheet Sản phẩm thiếu cột Mã hoặc Bán tại.");
  products.eachRow(function (row, rowNumber) {
    if (rowNumber === 1) return;
    var id = cellString(row.getCell(header["Mã"]).value);
    if (!selling[id]) return;
    row.getCell(header["Bán tại"]).value = selling[id].join(", ");
  });
  await workbook.xlsx.writeFile(file);
  console.log("Đã gắn điểm bán demo vào data/gian-hang.xlsx");
}

async function main() {
  for (var index = 0; index < stores.length; index += 1) {
    var point = await geocode(stores[index].query);
    stores[index].lat = point ? point.lat : null;
    stores[index].lng = point ? point.lng : null;
    console.log(stores[index].id, point ? point.lat + "," + point.lng : "không lấy được tọa độ");
    await wait(1100);
  }
  for (var shopIndex = 0; shopIndex < stores.length; shopIndex += 1) {
    await writeShop(stores[shopIndex]);
  }
  await upsertMarts();
  await updateSheOutlets();
}

main().catch(function (error) {
  console.error(error.message || error);
  process.exit(1);
});
