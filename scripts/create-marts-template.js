var fs = require("fs");
var path = require("path");
var ExcelJS = require("exceljs");
var limits = require("./limits");

var root = path.join(__dirname, "..");
var xlsxPath = path.join(root, "data", "marts.xlsx");
var force = process.argv.indexOf("--force") !== -1;

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

async function main() {
  if (fs.existsSync(xlsxPath) && !force) {
    throw new Error("Đã có data/marts.xlsx. Chạy npm run marts-template -- --force nếu muốn ghi đè.");
  }
  fs.mkdirSync(path.dirname(xlsxPath), { recursive: true });

  var workbook = new ExcelJS.Workbook();
  workbook.creator = "Visit Da Nang marts";

  var guide = workbook.addWorksheet("Hướng dẫn");
  guide.columns = [{ width: 28 }, { width: 110 }];
  [
    ["Mục", "Cách làm"],
    ["File này dùng để", "Dựng trang danh sách cửa hàng quà Việt. Mỗi dòng ở sheet Danh sách là một cửa hàng trên /marts.html."],
    ["Sau khi sửa", "Trong thư mục source, chạy: npm run marts"],
    ["Đường dẫn", "Cột Mã là đoạn sau dấu /. she-chocolate mở tại /she-chocolate/. Đổi mã là đổi đường dẫn."],
    ["Dòng GHI_CHU", "Dòng có mã GHI_CHU chỉ là ghi chú. Generator bỏ qua. Không xóa dòng này."],
    ["Danh mục", "Tag cách nhau bởi dấu phẩy. Chỉ dùng food, drink, spice, beauty, fashion, handicraft, health, experience. Tối đa 4 tag."],
    ["Có gian hàng", "có = khách bấm Vào gian hàng. không = chỉ hiện nút Chỉ đường nếu có link bản đồ."],
    ["Google Maps", "Dán link https từ Google Maps. Ô trống thì không hiện nút Chỉ đường."],
    ["Tọa độ", "Vĩ độ và Kinh độ giúp trang xếp cửa hàng gần khách lên trước. Trong Google Maps, chuột phải vào ghim, chép hai số. Ví dụ vĩ độ 16.0544, kinh độ 108.2022. Để trống nếu chưa có."],
    ["File gian hàng", "Khi Có gian hàng = có. SHE Chocolate đang dùng constants/generated-store.js và js/catalog.js. Cửa hàng mới để trống thì generator tự ghi stores/mã/generated-store.js và stores/mã/catalog.js."],
    ["Thứ tự", "Dòng trên hiện trước trên trang."],
    ["Ký tự", "Đếm từng chữ, kể cả dấu và khoảng trắng. Vượt giới hạn thì npm run marts dừng và báo đúng ô."]
  ].forEach(function (pair, index) {
    var row = guide.addRow(pair);
    row.alignment = { vertical: "top", wrapText: true };
    if (index === 0) {
      row.font = { bold: true, color: { argb: "FFFFFFFF" } };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3C2415" } };
    }
  });

  var sheet = workbook.addWorksheet("Danh sách");
  sheet.columns = limits.MART_COLUMNS.map(function (column) {
    return { width: column[0] === "mo_ta" || column[0] === "maps" ? 46 : 28 };
  });
  headerRow(sheet, limits.MART_COLUMNS.map(function (column) { return column[1]; }));
  noteRow(sheet, ["GHI_CHU"].concat(limits.MART_COLUMNS.slice(1).map(function (column) { return column[2]; })));
  sheet.addRow([
    "she-chocolate",
    "SHE Chocolate",
    "Dĩ An, TP. Hồ Chí Minh",
    "Sô-cô-la thủ công, đặt giao tận nơi.",
    "food",
    "có",
    "https://www.google.com/maps/search/?api=1&query=69+KDC+Nam+Thinh+Di+An",
    "",
    "",
    "constants/generated-store.js",
    "js/catalog.js"
  ]);
  sheet.views = [{ state: "frozen", ySplit: 2 }];
  sheet.dataValidations.add("F3:F400", { type: "list", allowBlank: false, formulae: ['"có,không"'] });

  await workbook.xlsx.writeFile(xlsxPath);
  console.log("Đã ghi data/marts.xlsx");
}

main().catch(function (error) {
  console.error(error.message || error);
  process.exit(1);
});
