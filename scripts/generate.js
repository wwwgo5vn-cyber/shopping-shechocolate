var fs = require("fs");
var path = require("path");
var ExcelJS = require("exceljs");
var limits = require("./limits");
var imageSize = require("./image-size").imageSize;

var root = path.join(__dirname, "..");

function readShopId() {
  var args = process.argv.slice(2);
  var flag = args.indexOf("--shop");
  if (flag !== -1) {
    var value = args[flag + 1];
    if (!value || value.indexOf("--") === 0) {
      console.error("Thiếu mã cửa hàng. Ví dụ: npm run shop -- dong-market");
      process.exit(1);
    }
    return value;
  }
  var positional = args.filter(function (arg) { return arg.indexOf("--") !== 0; })[0];
  return positional || "";
}

var shopId = readShopId();
if (shopId && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(shopId)) {
  console.error("Mã cửa hàng không hợp lệ: " + shopId + ". Dùng chữ thường, số và gạch ngang.");
  process.exit(1);
}
var xlsxPath = shopId
  ? path.join(root, "data", "shops", shopId + ".xlsx")
  : path.join(root, "data", "gian-hang.xlsx");
var imageDir = path.join(root, limits.LIMITS.image.folder);
var errors = [];

function chars(value) {
  return limits.chars(value);
}

function cellString(value) {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value.text) return String(value.text).trim();
    if (value.result != null) return cellString(value.result);
    if (Array.isArray(value.richText)) return value.richText.map(function (part) { return part.text; }).join("").trim();
  }
  return String(value).trim();
}

function fail(sheet, row, message) {
  errors.push(sheet + " dòng " + row + ": " + message);
}

function tooLong(sheet, row, label, value, max) {
  var count = chars(value);
  if (count > max) fail(sheet, row, label + " dài " + count + " ký tự, tối đa " + max + ".");
}

function readSheet(workbook, name) {
  var sheet = workbook.getWorksheet(name);
  if (!sheet) errors.push("Thiếu sheet " + name + ".");
  return sheet;
}

function checkImage(sheet, row, fileName) {
  var rule = limits.LIMITS.image;
  if (!fileName) return "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.(jpg|jpeg|png|webp)$/.test(fileName)) {
    fail(sheet, row, "Tên ảnh không hợp lệ: " + fileName + ". Dùng chữ thường, số, gạch ngang.");
    return "";
  }
  var full = path.join(imageDir, fileName);
  if (!fs.existsSync(full)) {
    fail(sheet, row, "Không thấy file images/" + fileName + ".");
    return "";
  }
  var buffer = fs.readFileSync(full);
  if (buffer.length > rule.maxBytes) {
    fail(sheet, row, "images/" + fileName + " nặng " + Math.ceil(buffer.length / 1024) + " KB, tối đa 400 KB.");
  }
  var size = imageSize(buffer);
  if (!size) {
    fail(sheet, row, "Không đọc được kích thước images/" + fileName + ".");
    return "images/" + fileName;
  }
  if (size.width !== size.height) {
    fail(sheet, row, "images/" + fileName + " là " + size.width + "×" + size.height + " px. Ảnh phải hình vuông.");
  } else if (size.width < rule.minSide || size.width > rule.maxSide) {
    fail(sheet, row, "images/" + fileName + " là " + size.width + "×" + size.height + " px. Mỗi cạnh từ " + rule.minSide + " đến " + rule.maxSide + " px, nên dùng " + rule.targetSide + "×" + rule.targetSide + ".");
  }
  return "images/" + fileName;
}

function slugOk(value, max) {
  return chars(value) <= max && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function coord(value, min, max) {
  if (!value) return null;
  var number = Number(String(value).replace(",", "."));
  if (!isFinite(number) || number < min || number > max) return NaN;
  return number;
}

function coordsFromUrl(url) {
  if (!url) return null;
  var match = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
    url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) ||
    url.match(/[?&](?:q|query|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
}

function headerMap(sheet) {
  var map = {};
  sheet.getRow(1).eachCell(function (cell, columnNumber) {
    map[cellString(cell.value)] = columnNumber;
  });
  return map;
}

function rowRecord(row, columns, headers) {
  var record = {};
  columns.forEach(function (column) {
    var columnNumber = headers[column[1]];
    record[column[0]] = columnNumber ? cellString(row.getCell(columnNumber).value) : "";
  });
  return record;
}

async function ensureOutletSheet(workbook) {
  var changed = false;
  var products = workbook.getWorksheet("Sản phẩm");
  if (products && !headerMap(products)["Bán tại"]) {
    var last = 0;
    products.getRow(1).eachCell(function (cell, columnNumber) {
      if (columnNumber > last) last = columnNumber;
    });
    var header = products.getRow(1).getCell(last + 1);
    header.value = "Bán tại";
    header.font = products.getRow(1).getCell(1).font;
    header.fill = products.getRow(1).getCell(1).fill;
    header.alignment = products.getRow(1).getCell(1).alignment;
    products.getColumn(last + 1).width = 36;
    if (cellString(products.getRow(2).getCell(1).value) === "GHI_CHU") {
      products.getRow(2).getCell(last + 1).value = limits.PRODUCT_COLUMNS.filter(function (column) {
        return column[0] === "ban_tai";
      })[0][2];
    }
    changed = true;
  }

  if (!workbook.getWorksheet("Điểm bán")) {
    var sheet = workbook.addWorksheet("Điểm bán");
    sheet.columns = limits.OUTLET_COLUMNS.map(function (column) {
      return { width: column[0] === "maps" ? 46 : 28 };
    });
    var titles = sheet.addRow(limits.OUTLET_COLUMNS.map(function (column) { return column[1]; }));
    titles.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri" };
    titles.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3C2415" } };
    titles.alignment = { vertical: "middle", wrapText: true };
    titles.height = 22;
    var note = sheet.addRow(["GHI_CHU"].concat(limits.OUTLET_COLUMNS.slice(1).map(function (column) { return column[2]; })));
    note.font = { italic: true, color: { argb: "FF6D6D6D" }, name: "Calibri" };
    note.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F1E6" } };
    note.alignment = { vertical: "top", wrapText: true };
    note.height = 64;
    sheet.views = [{ state: "frozen", ySplit: 2 }];
    changed = true;
  }

  var guide = workbook.getWorksheet("Hướng dẫn");
  if (guide) {
    var hasGuide = false;
    guide.eachRow(function (row) {
      if (cellString(row.getCell(1).value) === "Điểm bán") hasGuide = true;
    });
    if (!hasGuide) {
      var guideRow = guide.addRow([
        "Điểm bán",
        "Sheet Điểm bán là từng cửa hàng khách có thể đến mua. Cột Bán tại ở sheet Sản phẩm ghi mã những cửa hàng đang bán SKU đó, cách nhau bởi dấu phẩy. Ô trống = món chỉ giao tận nơi. Vĩ độ và kinh độ giúp xếp cửa hàng gần khách lên trước."
      ]);
      guideRow.alignment = { vertical: "top", wrapText: true };
      changed = true;
    }
  }

  if (!changed) return;
  try {
    await workbook.xlsx.writeFile(xlsxPath);
    console.log("Đã thêm sheet Điểm bán và cột Bán tại vào data/gian-hang.xlsx.");
  } catch (error) {
    if (error && error.code === "EBUSY") {
      console.log("data/gian-hang.xlsx đang mở. Đóng Excel rồi chạy lại npm run generate để thêm sheet Điểm bán và cột Bán tại.");
    } else {
      throw error;
    }
  }
}

async function main() {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(shopId
      ? "Chưa có data/shops/" + shopId + ".xlsx. Chạy npm run shop-template -- " + shopId + " --name Tên cửa hàng --area Khu vực trước."
      : "Chưa có data/gian-hang.xlsx. Chạy npm run template trước.");
  }
  var workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  if (!shopId) await ensureOutletSheet(workbook);

  var storeSheet = readSheet(workbook, "Cửa hàng");
  var categorySheet = readSheet(workbook, "Danh mục");
  var productSheet = readSheet(workbook, "Sản phẩm");
  var faqSheet = readSheet(workbook, "Câu hỏi");
  if (errors.length) return finish();

  var store = {};
  storeSheet.eachRow(function (row, rowNumber) {
    if (rowNumber === 1) return;
    var code = cellString(row.getCell(1).value);
    if (!code || code === "GHI_CHU") return;
    var content = cellString(row.getCell(2).value);
    var max = Object.prototype.hasOwnProperty.call(limits.LIMITS.store, code) ? limits.LIMITS.store[code] : null;
    if (max == null) {
      fail("Cửa hàng", rowNumber, "Mã không có trong mẫu: " + code + ".");
      return;
    }
    tooLong("Cửa hàng", rowNumber, code, content, max);
    if (code.indexOf("detail") === 0 && !content) fail("Cửa hàng", rowNumber, code + " không được để trống.");
    store[code] = content;
  });
  var fieldList = shopId ? limits.STORE_FIELDS.concat(limits.PLACE_FIELDS) : limits.STORE_FIELDS;
  fieldList.forEach(function (field) {
    if (!Object.prototype.hasOwnProperty.call(store, field[0])) {
      errors.push("Cửa hàng: thiếu mã " + field[0] + ".");
    }
  });
  if (store.url_nhan_don && !/^https:\/\/.+/i.test(store.url_nhan_don)) {
    errors.push("Cửa hàng: url_nhan_don phải bắt đầu bằng https:// hoặc để trống.");
  }
  if (store.link_shopee && !/^https:\/\/.+/i.test(store.link_shopee)) {
    errors.push("Cửa hàng: link_shopee phải là URL https hoặc để trống.");
  }
  if (!shopId && !/^https:\/\/.+/i.test(store.link_shopee || "")) {
    errors.push("Cửa hàng: link_shopee phải là URL https của gian hàng Shopee.");
  }
  var placeLat = null;
  var placeLng = null;
  if (shopId) {
    if (store.maps && !/^https:\/\/.+/i.test(store.maps)) errors.push("Cửa hàng: maps phải bắt đầu bằng https:// hoặc để trống.");
    placeLat = coord(store.vi_do, -90, 90);
    placeLng = coord(store.kinh_do, -180, 180);
    if (Number.isNaN(placeLat) || Number.isNaN(placeLng)) errors.push("Cửa hàng: vĩ độ hoặc kinh độ không hợp lệ.");
    if ((placeLat == null) !== (placeLng == null)) errors.push("Cửa hàng: điền cả vĩ độ và kinh độ, hoặc để trống cả hai.");
    if (placeLat == null) {
      var foundPlace = coordsFromUrl(store.maps);
      if (foundPlace) {
        placeLat = foundPlace.lat;
        placeLng = foundPlace.lng;
      }
    }
  }

  var categories = [];
  categorySheet.eachRow(function (row, rowNumber) {
    if (rowNumber === 1) return;
    var id = cellString(row.getCell(1).value);
    if (!id || id === "GHI_CHU") return;
    var name = cellString(row.getCell(2).value);
    var order = Number(cellString(row.getCell(3).value));
    if (!slugOk(id, limits.LIMITS.category.id)) fail("Danh mục", rowNumber, "Mã danh mục không hợp lệ: " + id + ".");
    if (!name) fail("Danh mục", rowNumber, "Thiếu tên hiển thị.");
    tooLong("Danh mục", rowNumber, "Tên", name, limits.LIMITS.category.name);
    if (!Number.isInteger(order)) fail("Danh mục", rowNumber, "Thứ tự phải là số nguyên.");
    categories.push({ id: id, name: name, order: order, row: rowNumber });
  });
  categories.sort(function (a, b) { return a.order - b.order; });
  var categoryIds = {};
  categories.forEach(function (category) {
    if (categoryIds[category.id]) fail("Danh mục", category.row, "Mã bị trùng: " + category.id + ".");
    categoryIds[category.id] = category.name;
  });
  if (!categories.length) errors.push("Danh mục: cần ít nhất một dòng.");

  var outlets = [];
  var outletIds = {};
  var outletSheet = shopId ? null : readSheet(workbook, "Điểm bán");
  if (outletSheet) {
    var outletHeaders = headerMap(outletSheet);
    outletSheet.eachRow(function (row, rowNumber) {
      if (rowNumber === 1) return;
      var record = rowRecord(row, limits.OUTLET_COLUMNS, outletHeaders);
      var id = record.ma;
      if (!id || id === "GHI_CHU") return;
      if (!slugOk(id, limits.LIMITS.outlet.id)) fail("Điểm bán", rowNumber, "Mã không hợp lệ: " + id + ".");
      if (outletIds[id]) fail("Điểm bán", rowNumber, "Mã bị trùng: " + id + ".");
      outletIds[id] = true;
      if (!record.ten) fail("Điểm bán", rowNumber, "Thiếu tên.");
      tooLong("Điểm bán", rowNumber, "Tên", record.ten, limits.LIMITS.outlet.name);
      tooLong("Điểm bán", rowNumber, "Khu vực", record.khu_vuc, limits.LIMITS.outlet.area);
      if (record.maps && !/^https:\/\/.+/i.test(record.maps)) fail("Điểm bán", rowNumber, "Google Maps phải bắt đầu bằng https:// hoặc để trống.");
      tooLong("Điểm bán", rowNumber, "Google Maps", record.maps, limits.LIMITS.outlet.maps);
      var lat = coord(record.vi_do, -90, 90);
      var lng = coord(record.kinh_do, -180, 180);
      if (Number.isNaN(lat) || Number.isNaN(lng)) fail("Điểm bán", rowNumber, "Vĩ độ hoặc kinh độ không hợp lệ.");
      if ((lat == null) !== (lng == null)) fail("Điểm bán", rowNumber, "Điền cả vĩ độ và kinh độ, hoặc để trống cả hai.");
      if (lat == null) {
        var found = coordsFromUrl(record.maps);
        if (found) {
          lat = found.lat;
          lng = found.lng;
        }
      }
      if (!record.maps && lat == null) fail("Điểm bán", rowNumber, "Cần link Google Maps hoặc cặp vĩ độ, kinh độ.");
      var place = { id: id, name: record.ten };
      if (record.khu_vuc) place.area = record.khu_vuc;
      if (record.maps) place.mapsUrl = record.maps;
      if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        place.lat = lat;
        place.lng = lng;
      }
      outlets.push(place);
    });
    if (outlets.length > limits.LIMITS.outlet.max) {
      errors.push("Điểm bán: có " + outlets.length + " cửa hàng, tối đa " + limits.LIMITS.outlet.max + ".");
    }
  }

  var products = [];
  var seen = {};
  var productHeaders = headerMap(productSheet);
  productSheet.eachRow(function (row, rowNumber) {
    if (rowNumber === 1) return;
    var record = rowRecord(row, limits.PRODUCT_COLUMNS, productHeaders);
    var id = record.ma;
    if (!id || id === "GHI_CHU") return;
    record.row = rowNumber;
    if (!slugOk(id, limits.LIMITS.product.id)) fail("Sản phẩm", rowNumber, "Mã không hợp lệ: " + id + ".");
    if (seen[id]) fail("Sản phẩm", rowNumber, "Mã bị trùng: " + id + ".");
    seen[id] = true;
    tooLong("Sản phẩm", rowNumber, "Tên", record.ten, limits.LIMITS.product.name);
    tooLong("Sản phẩm", rowNumber, "Mô tả ngắn", record.mo_ta_ngan, limits.LIMITS.product.menu);
    tooLong("Sản phẩm", rowNumber, "Mô tả vị", record.mo_ta_vi, limits.LIMITS.product.tasting);
    if (!record.ten) fail("Sản phẩm", rowNumber, "Thiếu tên.");
    if (!record.mo_ta_ngan) fail("Sản phẩm", rowNumber, "Thiếu mô tả ngắn.");
    if (!record.mo_ta_vi) fail("Sản phẩm", rowNumber, "Thiếu mô tả vị.");

    if (record.gia === "") record.price = null;
    else if (!/^\d+$/.test(record.gia) || Number(record.gia) > 99999999) {
      fail("Sản phẩm", rowNumber, "Giá phải là số nguyên, không chấm nghìn, hoặc để trống.");
      record.price = null;
    } else record.price = Number(record.gia);

    var packText = record.goi.toLowerCase();
    if (packText === "có" || packText === "co") record.packs = true;
    else if (packText === "không" || packText === "khong") record.packs = false;
    else fail("Sản phẩm", rowNumber, "Cột Bán 1-3-6 gói chỉ nhận có hoặc không.");

    record.categories = record.danh_muc.split(",").map(function (item) { return item.trim(); }).filter(Boolean);
    if (!record.categories.length) fail("Sản phẩm", rowNumber, "Thiếu danh mục.");
    record.categories.forEach(function (categoryId) {
      if (!categoryIds[categoryId]) fail("Sản phẩm", rowNumber, "Danh mục chưa khai báo: " + categoryId + ".");
    });

    record.image = checkImage("Sản phẩm", rowNumber, record.anh);
    if (limits.LIMITS.arts.indexOf(record.kieu_hinh) === -1) {
      fail("Sản phẩm", rowNumber, "Kiểu hình minh họa chỉ nhận jar, box hoặc pouch.");
    }
    if (limits.LIMITS.tones.indexOf(record.mau) === -1) {
      fail("Sản phẩm", rowNumber, "Màu minh họa không có trong danh sách.");
    }

    var ingredients = limits.linesOf(record.thanh_phan);
    var specs = limits.linesOf(record.quy_cach);
    if (ingredients.length > limits.LIMITS.product.ingredientLines) {
      fail("Sản phẩm", rowNumber, "Thành phần có " + ingredients.length + " dòng, tối đa " + limits.LIMITS.product.ingredientLines + ".");
    }
    ingredients.forEach(function (line, lineIndex) {
      tooLong("Sản phẩm", rowNumber, "Thành phần dòng " + (lineIndex + 1), line, limits.LIMITS.product.ingredientLine);
    });
    if (specs.length > limits.LIMITS.product.specLines) {
      fail("Sản phẩm", rowNumber, "Quy cách có " + specs.length + " dòng, tối đa " + limits.LIMITS.product.specLines + ".");
    }
    specs.forEach(function (line, lineIndex) {
      tooLong("Sản phẩm", rowNumber, "Quy cách dòng " + (lineIndex + 1), line, limits.LIMITS.product.specLine);
    });
    record.ingredients = ingredients;
    record.specs = specs;
    if (shopId) {
      record.stores = [];
    } else {
      record.stores = (record.ban_tai || "").split(",").map(function (item) { return item.trim(); }).filter(Boolean);
      if (record.stores.length > limits.LIMITS.product.maxStores) {
        fail("Sản phẩm", rowNumber, "Bán tại có " + record.stores.length + " cửa hàng, tối đa " + limits.LIMITS.product.maxStores + ".");
      }
      var seenStore = {};
      record.stores.forEach(function (storeId) {
        if (!slugOk(storeId, limits.LIMITS.outlet.id)) fail("Sản phẩm", rowNumber, "Mã điểm bán không hợp lệ: " + storeId + ".");
        else if (!outletIds[storeId]) fail("Sản phẩm", rowNumber, "Điểm bán chưa khai báo: " + storeId + ".");
        if (seenStore[storeId]) fail("Sản phẩm", rowNumber, "Mã điểm bán bị lặp: " + storeId + ".");
        seenStore[storeId] = true;
      });
    }
    products.push(record);
  });
  if (!products.length) errors.push("Sản phẩm: cần ít nhất một món.");

  var faqs = [];
  if (faqSheet) {
    faqSheet.eachRow(function (row, rowNumber) {
      if (rowNumber === 1) return;
      var question = cellString(row.getCell(1).value);
      var answer = cellString(row.getCell(2).value);
      if (!question || question === "GHI_CHU") return;
      if (!answer) fail("Câu hỏi", rowNumber, "Thiếu câu trả lời.");
      tooLong("Câu hỏi", rowNumber, "Câu hỏi", question, limits.LIMITS.faq.question);
      tooLong("Câu hỏi", rowNumber, "Trả lời", answer, limits.LIMITS.faq.answer);
      faqs.push({ q: question, a: answer });
    });
  }
  if (faqs.length > limits.LIMITS.faq.max) {
    errors.push("Câu hỏi: có " + faqs.length + " câu, tối đa " + limits.LIMITS.faq.max + ".");
  }
  if (!faqs.length) errors.push("Câu hỏi: cần ít nhất một câu.");

  if (errors.length) return finish();

  var catalog = {
    defaultId: products[0].ma,
    categories: categories.map(function (category) { return category.id; }),
    products: products.map(function (product) {
      return {
        id: product.ma,
        categories: product.categories,
        price: product.price,
        packs: product.packs,
        art: product.kieu_hinh,
        tone: product.mau,
        image: product.image,
        stores: product.stores
      };
    })
  };
  var content = {
    store: {
      name: store.name,
      mark: store.mark,
      kind: store.kind,
      area: store.area,
      delivery: store.delivery,
      fee: store.fee,
      hours: store.hours,
      promoShipTitle: store.promoShipTitle,
      promoShipBody: store.promoShipBody,
      promoPackTitle: store.promoPackTitle,
      promoPackBody: store.promoPackBody
    },
    categories: categoryIds,
    products: {}
  };
  products.forEach(function (product) {
    content.products[product.ma] = {
      name: product.ten,
      menu: product.mo_ta_ngan,
      tasting: product.mo_ta_vi,
      ingredients: product.ingredients,
      specs: product.specs
    };
  });

  var detailLabels = {
    availabilityTitle: store.detailStockTitle,
    availabilityAction: store.detailStockPlace,
    deliveryTitle: store.detailShipTitle,
    deliveryBody: store.detailShipBody,
    deliveryPrice: store.detailShipPrice,
    deliveryNote: store.detailShipNote,
    pickupTitle: store.detailPickupTitle,
    pickupBody: store.detailPickupBody,
    serviceTitle: store.detailServiceTitle,
    serviceBody: store.detailServiceBody
  };
  var detailJs = Object.keys(detailLabels).map(function (key) {
    return "window.SHE_LABELS." + key + " = " + JSON.stringify(detailLabels[key]) + ";\n";
  }).join("");
  var banner = shopId
    ? "/* Tạo bởi npm run shop -- " + shopId + ". Sửa data/shops/" + shopId + ".xlsx rồi chạy lại, đừng sửa file này. */\n"
    : "/* Tạo bởi npm run generate. Sửa data/gian-hang.xlsx rồi chạy lại, đừng sửa file này. */\n";
  var catalogPath = shopId ? path.join(root, "stores", shopId, "catalog.js") : path.join(root, "js", "catalog.js");
  var storePath = shopId ? path.join(root, "stores", shopId, "generated-store.js") : path.join(root, "constants", "generated-store.js");
  var order = {
    webhookUrl: store.url_nhan_don || "",
    shopeeUrl: store.link_shopee || "",
    mode: shopId ? "place" : "outlets"
  };
  var placeJs = "";
  if (shopId) {
    var place = { name: store.name, address: store.detailPickupBody, area: store.area || "" };
    if (store.maps) place.mapsUrl = store.maps;
    if (placeLat != null && placeLng != null && !Number.isNaN(placeLat) && !Number.isNaN(placeLng)) {
      place.lat = placeLat;
      place.lng = placeLng;
    }
    placeJs = "window.SHE_PLACE = " + JSON.stringify(place, null, 2) + ";\n";
  }
  fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
  fs.writeFileSync(
    catalogPath,
    banner +
      "window.SHE_CATALOG = " + JSON.stringify(catalog, null, 2) + ";\n" +
      "window.SHE_STORES = " + JSON.stringify(outlets, null, 2) + ";\n"
  );
  fs.writeFileSync(
    storePath,
    banner +
      "window.SHE_LABELS.store = " + JSON.stringify(content.store, null, 2) + ";\n" +
      "window.SHE_LABELS.categories = " + JSON.stringify(content.categories, null, 2) + ";\n" +
      "window.SHE_LABELS.products = " + JSON.stringify(content.products, null, 2) + ";\n" +
      detailJs +
      "window.SHE_LABELS.faq = " + JSON.stringify(faqs, null, 2) + ";\n" +
      "window.SHE_ORDER = " + JSON.stringify(order, null, 2) + ";\n" +
      placeJs
  );
  console.log((shopId ? "Đã dựng gian hàng " + shopId + ": " : "Đã dựng ") + products.length + " món, " + categories.length + " danh mục.");
}

function finish() {
  console.error("Chưa dựng được gian hàng:");
  errors.forEach(function (error) { console.error("- " + error); });
  process.exit(1);
}

main().catch(function (error) {
  console.error(error.message || error);
  process.exit(1);
});
