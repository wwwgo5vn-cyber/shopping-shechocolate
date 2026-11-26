var fs = require("fs");
var path = require("path");
var ExcelJS = require("exceljs");
var limits = require("./limits");

var root = path.join(__dirname, "..");
var xlsxPath = path.join(root, "data", "marts.xlsx");
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

function fail(row, message) {
  errors.push("Danh sách dòng " + row + ": " + message);
}

function tooLong(row, label, value, max) {
  var count = chars(value);
  if (count > max) fail(row, label + " dài " + count + " ký tự, tối đa " + max + ".");
}

function fileOk(value) {
  return /^[a-z0-9._/-]+$/.test(value) && value.indexOf("..") === -1;
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

async function ensureCoordColumns(workbook, sheet) {
  var headerColumn = {};
  sheet.getRow(1).eachCell(function (cell, columnNumber) {
    headerColumn[cellString(cell.value)] = columnNumber;
  });
  if (headerColumn["Vĩ độ"] && headerColumn["Kinh độ"]) return false;
  var mapsColumn = headerColumn["Google Maps"] || 7;
  sheet.spliceColumns(mapsColumn + 1, 0, [], []);
  var source = sheet.getRow(1).getCell(1);
  ["Vĩ độ", "Kinh độ"].forEach(function (label, index) {
    var cell = sheet.getRow(1).getCell(mapsColumn + 1 + index);
    cell.value = label;
    cell.font = source.font;
    cell.fill = source.fill;
    cell.alignment = source.alignment;
    sheet.getColumn(mapsColumn + 1 + index).width = 22;
  });
  var note = sheet.getRow(2);
  if (cellString(note.getCell(1).value) === "GHI_CHU") {
    note.getCell(mapsColumn + 1).value = limits.MART_COLUMNS.filter(function (column) { return column[0] === "vi_do"; })[0][2];
    note.getCell(mapsColumn + 2).value = limits.MART_COLUMNS.filter(function (column) { return column[0] === "kinh_do"; })[0][2];
  }
  var guide = workbook.getWorksheet("Hướng dẫn");
  if (guide) {
    var has = false;
    guide.eachRow(function (row) {
      if (cellString(row.getCell(1).value) === "Tọa độ") has = true;
    });
    if (!has) {
      var row = guide.addRow(["Tọa độ", "Vĩ độ và Kinh độ giúp trang xếp cửa hàng gần khách lên trước. Trong Google Maps, chuột phải vào ghim, chép hai số. Ví dụ vĩ độ 16.0544, kinh độ 108.2022. Để trống nếu chưa có."]);
      row.alignment = { vertical: "top", wrapText: true };
    }
  }
  try {
    await workbook.xlsx.writeFile(xlsxPath);
    console.log("Đã thêm cột Vĩ độ và Kinh độ vào data/marts.xlsx.");
  } catch (error) {
    if (error && error.code === "EBUSY") {
      console.log("data/marts.xlsx đang mở. Đóng Excel rồi chạy lại npm run marts để thêm cột Vĩ độ và Kinh độ.");
    } else {
      throw error;
    }
  }
  return true;
}

async function main() {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error("Chưa có data/marts.xlsx. Chạy npm run marts-template trước.");
  }
  var workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  var sheet = workbook.getWorksheet("Danh sách");
  if (!sheet) {
    console.error("Chưa dựng được danh sách cửa hàng:\n- Thiếu sheet Danh sách.");
    process.exit(1);
  }
  await ensureCoordColumns(workbook, sheet);

  var places = [];
  var seen = {};
  var rule = limits.LIMITS.mart;
  var headerColumn = {};
  sheet.getRow(1).eachCell(function (cell, columnNumber) {
    headerColumn[cellString(cell.value)] = columnNumber;
  });
  sheet.eachRow(function (row, rowNumber) {
    if (rowNumber === 1) return;
    var record = {};
    limits.MART_COLUMNS.forEach(function (column) {
      var columnNumber = headerColumn[column[1]];
      record[column[0]] = columnNumber ? cellString(row.getCell(columnNumber).value) : "";
    });

    var id = record.ma;
    if (!id || id === "GHI_CHU") return;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || chars(id) > rule.id) {
      fail(rowNumber, "Mã không hợp lệ: " + id + ".");
    }
    if (seen[id]) fail(rowNumber, "Mã bị trùng: " + id + ".");
    seen[id] = true;
    if (!record.ten) fail(rowNumber, "Thiếu tên.");
    if (!record.khu_vuc) fail(rowNumber, "Thiếu khu vực.");
    if (!record.mo_ta) fail(rowNumber, "Thiếu mô tả.");
    tooLong(rowNumber, "Tên", record.ten, rule.name);
    tooLong(rowNumber, "Khu vực", record.khu_vuc, rule.area);
    tooLong(rowNumber, "Mô tả", record.mo_ta, rule.summary);

    var tags = record.danh_muc.split(",").map(function (tag) { return tag.trim(); }).filter(Boolean);
    if (!tags.length) fail(rowNumber, "Thiếu danh mục.");
    if (tags.length > rule.maxTags) fail(rowNumber, "Có " + tags.length + " danh mục, tối đa " + rule.maxTags + ".");
    tags.forEach(function (tag) {
      if (limits.LIMITS.martTags.indexOf(tag) === -1) fail(rowNumber, "Danh mục chưa cho phép: " + tag + ".");
    });

    var shop = record.gian_hang.toLowerCase();
    if (shop !== "có" && shop !== "không") fail(rowNumber, "Có gian hàng chỉ nhận có hoặc không.");
    var hasShop = shop === "có";

    if (record.maps && !/^https:\/\/.+/i.test(record.maps)) fail(rowNumber, "Google Maps phải bắt đầu bằng https:// hoặc để trống.");
    tooLong(rowNumber, "Google Maps", record.maps, rule.maps);
    var lat = coord(record.vi_do, -90, 90);
    var lng = coord(record.kinh_do, -180, 180);
    if (Number.isNaN(lat) || Number.isNaN(lng)) fail(rowNumber, "Vĩ độ hoặc kinh độ không hợp lệ.");
    if ((lat == null) !== (lng == null)) fail(rowNumber, "Điền cả vĩ độ và kinh độ, hoặc để trống cả hai.");
    if (lat == null) {
      var found = coordsFromUrl(record.maps);
      if (found) {
        lat = found.lat;
        lng = found.lng;
      }
    }

    var storeData = record.du_lieu;
    var catalog = record.catalog;
    if (hasShop) {
      if (!storeData) storeData = "stores/" + id + "/generated-store.js";
      if (!catalog) catalog = "stores/" + id + "/catalog.js";
      if (!fileOk(storeData)) fail(rowNumber, "File dữ liệu gian hàng không hợp lệ: " + storeData + ".");
      if (!fileOk(catalog)) fail(rowNumber, "File catalog không hợp lệ: " + catalog + ".");
      tooLong(rowNumber, "File dữ liệu", storeData, rule.file);
      tooLong(rowNumber, "File catalog", catalog, rule.file);
    }

    var place = {
      id: id,
      name: record.ten,
      area: record.khu_vuc,
      summary: record.mo_ta,
      tags: tags,
      shop: hasShop
    };
    if (hasShop) {
      place.storeData = storeData;
      place.catalog = catalog;
    }
    if (record.maps) place.mapsUrl = record.maps;
    if (lat != null && lng != null) {
      place.lat = lat;
      place.lng = lng;
    }
    places.push(place);
  });

  if (!places.length) errors.push("Danh sách: cần ít nhất một cửa hàng.");
  if (errors.length) {
    console.error("Chưa dựng được danh sách cửa hàng:");
    errors.forEach(function (error) { console.error("- " + error); });
    process.exit(1);
  }

  var banner = "/* Tạo bởi npm run marts. Sửa data/marts.xlsx rồi chạy lại, đừng sửa file này. */\n";
  fs.writeFileSync(
    path.join(root, "constants", "places.js"),
    banner +
      "window.VISIT_TAGS = " + JSON.stringify(limits.LIMITS.martTags, null, 2) + ";\n\n" +
      "window.VISIT_PLACES = " + JSON.stringify(places, null, 2) + ";\n"
  );
  console.log("Đã dựng " + places.length + " cửa hàng.");
  require("./write-store-pages.js");
}

main().catch(function (error) {
  console.error(error.message || error);
  process.exit(1);
});
