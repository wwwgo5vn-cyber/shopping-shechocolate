var fs = require("fs");
var path = require("path");
var ExcelJS = require("exceljs");
var limits = require("./limits");
var imageSize = require("./image-size").imageSize;

var root = path.join(__dirname, "..");
var xlsxPath = path.join(root, "data", "gian-hang.xlsx");
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

async function main() {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error("Chưa có data/gian-hang.xlsx. Chạy npm run template trước.");
  }
  var workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);

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
    if (!limits.LIMITS.store.hasOwnProperty(code)) {
      fail("Cửa hàng", rowNumber, "Mã không có trong mẫu: " + code + ".");
      return;
    }
    tooLong("Cửa hàng", rowNumber, code, content, limits.LIMITS.store[code]);
    if (code.indexOf("detail") === 0 && !content) fail("Cửa hàng", rowNumber, code + " không được để trống.");
    store[code] = content;
  });
  limits.STORE_FIELDS.forEach(function (field) {
    if (!Object.prototype.hasOwnProperty.call(store, field[0])) {
      errors.push("Cửa hàng: thiếu mã " + field[0] + ".");
    }
  });
  if (store.url_nhan_don && !/^https:\/\/.+/i.test(store.url_nhan_don)) {
    errors.push("Cửa hàng: url_nhan_don phải bắt đầu bằng https:// hoặc để trống.");
  }
  if (!/^https:\/\/.+/i.test(store.link_shopee || "")) {
    errors.push("Cửa hàng: link_shopee phải là URL https của gian hàng Shopee.");
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

  var products = [];
  var seen = {};
  productSheet.eachRow(function (row, rowNumber) {
    if (rowNumber === 1) return;
    var values = [];
    for (var index = 1; index <= limits.PRODUCT_COLUMNS.length; index += 1) {
      values.push(cellString(row.getCell(index).value));
    }
    var id = values[0];
    if (!id || id === "GHI_CHU") return;
    var record = {};
    limits.PRODUCT_COLUMNS.forEach(function (column, columnIndex) {
      record[column[0]] = values[columnIndex];
    });
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
        image: product.image
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
  var banner = "/* Tạo bởi npm run generate. Sửa data/gian-hang.xlsx rồi chạy lại, đừng sửa file này. */\n";
  fs.writeFileSync(path.join(root, "js", "catalog.js"), banner + "window.SHE_CATALOG = " + JSON.stringify(catalog, null, 2) + ";\n");
  fs.writeFileSync(
    path.join(root, "constants", "generated-store.js"),
    banner +
      "window.SHE_LABELS.store = " + JSON.stringify(content.store, null, 2) + ";\n" +
      "window.SHE_LABELS.categories = " + JSON.stringify(content.categories, null, 2) + ";\n" +
      "window.SHE_LABELS.products = " + JSON.stringify(content.products, null, 2) + ";\n" +
      detailJs +
      "window.SHE_LABELS.faq = " + JSON.stringify(faqs, null, 2) + ";\n" +
      "window.SHE_ORDER = " + JSON.stringify({ webhookUrl: store.url_nhan_don || "", shopeeUrl: store.link_shopee }, null, 2) + ";\n"
  );
  console.log("Đã dựng " + products.length + " món, " + categories.length + " danh mục.");
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
