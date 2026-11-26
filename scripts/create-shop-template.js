var fs = require("fs");
var path = require("path");
var ExcelJS = require("exceljs");
var limits = require("./limits");

var root = path.join(__dirname, "..");
var force = process.argv.indexOf("--force") !== -1;
var args = process.argv.slice(2).filter(function (arg) { return arg !== "--force"; });

function valueAfter(flag) {
  var index = args.indexOf(flag);
  if (index === -1) return "";
  var parts = [];
  for (var cursor = index + 1; cursor < args.length; cursor += 1) {
    if (args[cursor].indexOf("--") === 0) break;
    parts.push(args[cursor]);
  }
  return parts.join(" ");
}

var shopId = valueAfter("--id") || args.filter(function (arg, index) {
  return arg.indexOf("--") !== 0 && (index === 0 || args[index - 1].indexOf("--") !== 0);
})[0] || "";
var shopName = valueAfter("--name");
var shopArea = valueAfter("--area");

function chars(value) {
  return limits.chars(value);
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
  row.height = 64;
}

function cellString(value) {
  if (value == null) return "";
  if (typeof value === "object" && value.text) return String(value.text).trim();
  return String(value).trim();
}

function storeSeed() {
  var mark = shopName.split(/\s+/).map(function (part) { return part.charAt(0); }).join("")
    .replace(/đ/gi, "D").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().slice(0, limits.LIMITS.store.mark) || "SHOP";
  var address = shopName + ", " + shopArea;
  var maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(shopName + " " + shopArea);
  return {
    name: shopName,
    mark: mark,
    kind: "Cửa hàng",
    area: shopArea,
    delivery: "Đặt trên trang này, nhân viên gọi xác nhận.",
    fee: "Phí giao báo khi xác nhận đơn.",
    hours: "Liên hệ cửa hàng để xác nhận.",
    promoShipTitle: "Giao tận nơi",
    promoShipBody: "Nhân viên gọi xác nhận",
    promoPackTitle: "Đến cửa hàng",
    promoPackBody: "Mở đường trong trang món",
    link_shopee: "",
    url_nhan_don: "",
    detailStockTitle: "Đang bán tại cửa hàng",
    detailStockPlace: shopArea,
    detailShipTitle: "Giao tận nơi",
    detailShipBody: "Nhân viên gọi xác nhận rồi giao.",
    detailShipPrice: "Theo địa chỉ",
    detailShipNote: "Phí giao báo khi xác nhận đơn.",
    detailPickupTitle: "Đến cửa hàng",
    detailPickupBody: address,
    detailServiceTitle: "Liên hệ cửa hàng",
    detailServiceBody: "Đang cập nhật",
    maps: maps,
    vi_do: "",
    kinh_do: ""
  };
}

async function addMartRow() {
  var martsPath = path.join(root, "data", "marts.xlsx");
  if (!fs.existsSync(martsPath)) {
    console.log("Chưa có data/marts.xlsx. Thêm cửa hàng này vào danh sách sau khi chạy npm run marts-template.");
    return;
  }
  var workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(martsPath);
  var sheet = workbook.getWorksheet("Danh sách");
  if (!sheet) {
    console.log("data/marts.xlsx thiếu sheet Danh sách.");
    return;
  }
  var header = {};
  sheet.getRow(1).eachCell(function (cell, columnNumber) {
    header[cellString(cell.value)] = columnNumber;
  });
  var idColumn = header["Mã"];
  var exists = false;
  if (idColumn) {
    sheet.eachRow(function (row, rowNumber) {
      if (rowNumber > 1 && cellString(row.getCell(idColumn).value) === shopId) exists = true;
    });
  }
  if (exists) {
    console.log("data/marts.xlsx đã có mã " + shopId + ".");
    return;
  }
  var values = {
    "Mã": shopId,
    "Tên": shopName,
    "Khu vực": shopArea,
    "Mô tả": "Đến cửa hàng hoặc đặt giao tận nơi.",
    "Danh mục": "food",
    "Có gian hàng": "có",
    "Google Maps": storeSeed().maps,
    "Vĩ độ": "",
    "Kinh độ": "",
    "File dữ liệu gian hàng": "stores/" + shopId + "/generated-store.js",
    "File catalog": "stores/" + shopId + "/catalog.js"
  };
  var row = sheet.addRow([]);
  Object.keys(values).forEach(function (label) {
    if (header[label]) row.getCell(header[label]).value = values[label];
  });
  await workbook.xlsx.writeFile(martsPath);
  console.log("Đã thêm " + shopId + " vào data/marts.xlsx. Chạy npm run marts để hiện trên trang danh sách.");
}

async function main() {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(shopId)) {
    throw new Error("Thiếu mã hợp lệ. Ví dụ: npm run shop-template -- dong-market --name Đông Market --area Đà Nẵng");
  }
  if (!shopName || chars(shopName) > limits.LIMITS.store.name) {
    throw new Error("Tên cửa hàng là bắt buộc, tối đa " + limits.LIMITS.store.name + " ký tự.");
  }
  if (!shopArea || chars(shopArea) > limits.LIMITS.store.area) {
    throw new Error("Khu vực là bắt buộc, tối đa " + limits.LIMITS.store.area + " ký tự.");
  }
  var xlsxPath = path.join(root, "data", "shops", shopId + ".xlsx");
  if (fs.existsSync(xlsxPath) && !force) {
    throw new Error("Đã có data/shops/" + shopId + ".xlsx. Không ghi đè.");
  }
  fs.mkdirSync(path.dirname(xlsxPath), { recursive: true });

  var content = storeSeed();
  var workbook = new ExcelJS.Workbook();
  workbook.creator = "Visit Da Nang shop";

  var guide = workbook.addWorksheet("Hướng dẫn");
  guide.columns = [{ width: 28 }, { width: 110 }];
  [
    ["Mục", "Cách làm"],
    ["File này dùng để", "Dựng gian hàng " + shopName + ". Khách thấy một địa chỉ và nút dẫn đường, không thấy danh sách nhiều cửa hàng như SHE Chocolate."],
    ["Sau khi sửa", "Trong thư mục source, chạy: npm run shop -- " + shopId],
    ["Trang", "Mở /" + shopId + "/ sau khi đã có dòng này trong data/marts.xlsx và đã chạy npm run marts."],
    ["Địa chỉ", "Sửa mã detailPickupBody ở sheet Cửa hàng. Đây là dòng địa chỉ trên trang đặt hàng."],
    ["Dẫn đường", "Dán link https vào mã maps. Vĩ độ và kinh độ giúp nút dẫn đường xuất phát từ vị trí khách. Chuột phải vào ghim Google Maps rồi chép hai số."],
    ["Sản phẩm mẫu", "Dòng san-pham-mau chỉ để thử. Xóa và thêm món thật. Ảnh để trong thư mục images, cột Ảnh chỉ ghi tên file."],
    ["Dòng GHI_CHU", "Dòng có mã GHI_CHU chỉ là ghi chú. Generator bỏ qua. Không xóa dòng này."]
  ].forEach(function (pair, index) {
    var row = guide.addRow(pair);
    row.alignment = { vertical: "top", wrapText: true };
    if (index === 0) {
      row.font = { bold: true, color: { argb: "FFFFFFFF" } };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3C2415" } };
    }
  });

  var store = workbook.addWorksheet("Cửa hàng");
  store.columns = [{ width: 28 }, { width: 78 }, { width: 56 }];
  headerRow(store, ["Mã", "Nội dung", "Giới hạn"]);
  noteRow(store, ["GHI_CHU", "Dòng này không phải dữ liệu.", "Generator bỏ qua mã GHI_CHU."]);
  limits.STORE_FIELDS.concat(limits.PLACE_FIELDS).forEach(function (field) {
    var max = Object.prototype.hasOwnProperty.call(limits.LIMITS.store, field[0]) ? limits.LIMITS.store[field[0]] : 300;
    var note = "Tối đa " + max + " ký tự. " + field[1] + ".";
    if (field[0] === "link_shopee" || field[0] === "url_nhan_don") note = "Để trống được. Nếu điền thì phải là URL https.";
    if (field[0] === "maps") note = "Link https dẫn tới đúng cửa hàng. Để trống nếu chưa có. Tối đa " + limits.LIMITS.store.maps + " ký tự.";
    if (field[0] === "vi_do" || field[0] === "kinh_do") note = "Số thập phân, đi cùng nhau. Để trống nếu link Google Maps đã có tọa độ.";
    store.addRow([field[0], content[field[0]], note]);
  });
  store.views = [{ state: "frozen", ySplit: 2 }];

  var categories = workbook.addWorksheet("Danh mục");
  categories.columns = [{ width: 18 }, { width: 28 }, { width: 14 }, { width: 56 }];
  headerRow(categories, ["Mã", "Tên hiển thị", "Thứ tự", "Giới hạn"]);
  noteRow(categories, ["GHI_CHU", "Tên hiển thị trên tab.", "Số nguyên, nhỏ hiện trước.", "Mã: chữ thường, số, gạch ngang."]);
  categories.addRow(["hang", "Hàng bán", 1, "Đổi tên này theo cửa hàng."]);
  categories.views = [{ state: "frozen", ySplit: 2 }];

  var products = workbook.addWorksheet("Sản phẩm");
  products.columns = limits.PRODUCT_COLUMNS.map(function (column) {
    return { width: column[0] === "thanh_phan" || column[0] === "quy_cach" ? 46 : 28 };
  });
  headerRow(products, limits.PRODUCT_COLUMNS.map(function (column) { return column[1]; }));
  noteRow(products, ["GHI_CHU"].concat(limits.PRODUCT_COLUMNS.slice(1).map(function (column) { return column[2]; })));
  var sample = {
    ma: "san-pham-mau",
    ten: "Sản phẩm mẫu",
    mo_ta_ngan: "Dòng này để thử gian hàng. Xóa khi nạp món thật.",
    mo_ta_vi: "Thay bằng mô tả món thật trước khi đưa khách xem.",
    gia: "",
    goi: "không",
    danh_muc: "hang",
    anh: "",
    shopee: "",
    thanh_phan: "Thành phần in trên bao bì.",
    quy_cach: "Quy cách in trên bao bì.",
    kieu_hinh: "box",
    mau: "gift",
    ban_tai: ""
  };
  products.addRow(limits.PRODUCT_COLUMNS.map(function (column) { return sample[column[0]]; }));
  products.views = [{ state: "frozen", ySplit: 2 }];
  products.dataValidations.add("F3:F400", { type: "list", allowBlank: false, formulae: ['"có,không"'] });
  products.dataValidations.add("L3:L400", { type: "list", allowBlank: false, formulae: ['"jar,box,pouch"'] });
  products.dataValidations.add("M3:M400", { type: "list", allowBlank: false, formulae: ['"' + limits.LIMITS.tones.join(",") + '"'] });

  var faq = workbook.addWorksheet("Câu hỏi");
  faq.columns = [{ width: 52 }, { width: 88 }, { width: 42 }];
  headerRow(faq, ["Câu hỏi", "Trả lời", "Giới hạn"]);
  noteRow(faq, ["GHI_CHU", "Câu trả lời hiện trong mục Câu hỏi thường gặp.", "Tối đa " + limits.LIMITS.faq.max + " câu."]);
  faq.addRow(["Cửa hàng ở đâu?", "Địa chỉ và nút dẫn đường nằm trong trang từng món.", "Sửa câu này theo cửa hàng."]);
  faq.views = [{ state: "frozen", ySplit: 2 }];

  await workbook.xlsx.writeFile(xlsxPath);
  console.log("Đã ghi data/shops/" + shopId + ".xlsx");
  try {
    await addMartRow();
  } catch (error) {
    if (error && error.code === "EBUSY") {
      console.log("data/marts.xlsx đang mở. Đóng Excel rồi thêm dòng " + shopId + " bằng tay, hoặc chạy lại lệnh này sau khi đóng file.");
    } else {
      throw error;
    }
  }
}

main().catch(function (error) {
  console.error(error.message || error);
  process.exit(1);
});
