var fs = require("fs");
var path = require("path");
var ExcelJS = require("exceljs");
var jpeg = require("jpeg-js");
var limits = require("./limits");
var seed = require("./seed");

var root = path.join(__dirname, "..");
var xlsxPath = path.join(root, "data", "gian-hang.xlsx");
var imageDir = path.join(root, limits.LIMITS.image.folder);
var force = process.argv.indexOf("--force") !== -1;

function hexRgb(hex) {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function writePlaceholder(fileName, hex) {
  var size = limits.LIMITS.image.targetSide;
  var rgb = hexRgb(hex);
  var data = Buffer.alloc(size * size * 4);
  for (var i = 0; i < size * size; i += 1) {
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  var encoded = jpeg.encode({ data: data, width: size, height: size }, 60);
  fs.writeFileSync(path.join(imageDir, fileName), encoded.data);
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

async function main() {
  if (fs.existsSync(xlsxPath) && !force) {
    throw new Error("Đã có data/gian-hang.xlsx. Chạy npm run template -- --force nếu muốn ghi đè.");
  }
  fs.mkdirSync(path.dirname(xlsxPath), { recursive: true });
  fs.mkdirSync(imageDir, { recursive: true });

  Object.keys(seed.swatches).forEach(function (fileName) {
    var target = path.join(imageDir, fileName);
    if (!fs.existsSync(target) || force) writePlaceholder(fileName, seed.swatches[fileName]);
  });

  var workbook = new ExcelJS.Workbook();
  workbook.creator = "SHE Chocolate generator";

  var guide = workbook.addWorksheet("Hướng dẫn");
  guide.columns = [{ width: 28 }, { width: 110 }];
  var guideRows = [
    ["Mục", "Cách làm"],
    ["File này dùng để", "Dựng gian hàng trên web. Sửa sheet Cửa hàng, Danh mục, Sản phẩm. Không ghi đơn hàng vào đây."],
    ["Đơn hàng", "Đơn khách đi vào Google Sheet khác. Dán URL web app vào dòng url_nhan_don ở sheet Cửa hàng. Script dán vào Google Sheet nằm ở scripts/nhan-don.gs."],
    ["Sau khi sửa", "Trong thư mục source, chạy: npm run generate"],
    ["Dòng GHI_CHU", "Dòng có mã GHI_CHU chỉ là ghi chú giới hạn. Generator bỏ qua dòng đó. Không xóa dòng này."],
    ["Ảnh để ở đâu", "Thư mục images trong source, cùng cấp với index.html. Cột Ảnh chỉ ghi tên file, ví dụ hat-sen-hu.jpg. Không upload ảnh lên host khác."],
    ["Định dạng ảnh", "jpg, jpeg, png hoặc webp."],
    ["Kích thước ảnh", "Hình vuông 800 × 800 pixel. Chấp nhận từ 600 × 600 đến 1600 × 1600, hai cạnh phải bằng nhau. Ảnh hiện trong ô menu 96 × 96 và khung chi tiết, trang cắt vừa khung."],
    ["Dung lượng ảnh", "Tối đa 400 KB mỗi file."],
    ["Tên file ảnh", "Chữ thường không dấu, số và dấu gạch ngang. Không khoảng trắng, không dấu tiếng Việt. Ví dụ hat-sen-hu.jpg."],
    ["Ảnh mẫu", "Các file jpg đang có trong images là nền màu 800 × 800 để thử generator. Thay bằng ảnh sản phẩm thật, giữ đúng tên file hoặc sửa cột Ảnh."],
    ["Link Shopee", "Một link cho cả gian hàng, điền ở sheet Cửa hàng, mã link_shopee. Mọi nút Shopee trên web mở đúng link đó."],
    ["Trang chi tiết", "Dòng còn hàng, giao nhanh, nhận tại xưởng và hotline sửa ở sheet Cửa hàng, các mã bắt đầu bằng detail. Câu hỏi thường gặp sửa ở sheet Câu hỏi: một dòng một câu, cột Câu hỏi và cột Trả lời."],
    ["Điểm bán", "Sheet Điểm bán là từng cửa hàng khách có thể đến mua. Cột Bán tại ở sheet Sản phẩm ghi mã những cửa hàng đang bán SKU đó, cách nhau bởi dấu phẩy. Ô trống = món chỉ giao tận nơi. Vĩ độ và kinh độ giúp xếp cửa hàng gần khách lên trước."],
    ["Giá", "Số nguyên, không chấm nghìn. 137000 nghĩa là 137.000₫. Ô trống = trang hiện Liên hệ."],
    ["Gói 1-3-6", "Cột Bán 1-3-6 gói chỉ nhận có hoặc không."],
    ["Thành phần và quy cách", "Muốn nhiều ý thì bấm Alt+Enter trong ô. Mỗi ý một dòng, trong giới hạn ghi ở dòng GHI_CHU."],
    ["Mã món và mã danh mục", "Tối đa 32 ký tự với món, 24 ký tự với danh mục. Chỉ chữ thường không dấu, số và dấu gạch ngang. Ví dụ hat-sen-hu."],
    ["Ký tự", "Đếm từng chữ, kể cả dấu và khoảng trắng. Vượt giới hạn thì npm run generate dừng và báo đúng ô."]
  ];
  guideRows.forEach(function (pair, index) {
    var row = guide.addRow(pair);
    row.alignment = { vertical: "top", wrapText: true };
    if (index === 0) {
      row.font = { bold: true, color: { argb: "FFFFFFFF" } };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3C2415" } };
    }
  });

  var store = workbook.addWorksheet("Cửa hàng");
  store.columns = [{ width: 28 }, { width: 70 }, { width: 42 }];
  headerRow(store, ["Mã", "Nội dung", "Giới hạn"]);
  noteRow(store, ["GHI_CHU", "Dòng này không phải dữ liệu.", "Generator bỏ qua mã GHI_CHU."]);
  STORE_ROWS().forEach(function (item) {
    store.addRow(item);
  });
  store.views = [{ state: "frozen", ySplit: 2 }];

  var categories = workbook.addWorksheet("Danh mục");
  categories.columns = [{ width: 18 }, { width: 28 }, { width: 14 }, { width: 56 }];
  headerRow(categories, ["Mã", "Tên hiển thị", "Thứ tự", "Giới hạn"]);
  noteRow(categories, [
    "GHI_CHU",
    "Tối đa " + limits.LIMITS.category.name + " ký tự. Ví dụ: Phổ biến.",
    "Số nguyên, nhỏ hiện trước.",
    "Mã tối đa " + limits.LIMITS.category.id + " ký tự: chữ thường, số, gạch ngang."
  ]);
  seed.categories.forEach(function (item) {
    categories.addRow([item[0], item[1], item[2], "Tên ≤ " + limits.LIMITS.category.name + " ký tự"]);
  });
  categories.views = [{ state: "frozen", ySplit: 2 }];

  var products = workbook.addWorksheet("Sản phẩm");
  products.columns = limits.PRODUCT_COLUMNS.map(function (column) {
    return { width: column[0] === "thanh_phan" || column[0] === "quy_cach" ? 46 : 28 };
  });
  headerRow(products, limits.PRODUCT_COLUMNS.map(function (column) { return column[1]; }));
  noteRow(products, ["GHI_CHU"].concat(limits.PRODUCT_COLUMNS.slice(1).map(function (column) { return column[2]; })));
  seed.products.forEach(function (product) {
    products.addRow(limits.PRODUCT_COLUMNS.map(function (column) { return product[column[0]]; }));
  });
  products.views = [{ state: "frozen", ySplit: 2 }];

  var outlets = workbook.addWorksheet("Điểm bán");
  outlets.columns = limits.OUTLET_COLUMNS.map(function (column) {
    return { width: column[0] === "maps" ? 46 : 28 };
  });
  headerRow(outlets, limits.OUTLET_COLUMNS.map(function (column) { return column[1]; }));
  noteRow(outlets, ["GHI_CHU"].concat(limits.OUTLET_COLUMNS.slice(1).map(function (column) { return column[2]; })));
  outlets.views = [{ state: "frozen", ySplit: 2 }];

  var faq = workbook.addWorksheet("Câu hỏi");
  faq.columns = [{ width: 52 }, { width: 88 }, { width: 42 }];
  headerRow(faq, ["Câu hỏi", "Trả lời", "Giới hạn"]);
  noteRow(faq, [
    "GHI_CHU",
    "Tối đa " + limits.LIMITS.faq.answer + " ký tự. Hiện trong mục Câu hỏi thường gặp ở trang chi tiết.",
    "Câu hỏi tối đa " + limits.LIMITS.faq.question + " ký tự. Tối đa " + limits.LIMITS.faq.max + " câu. Dòng GHI_CHU bị bỏ qua."
  ]);
  seed.faqs.forEach(function (item) {
    faq.addRow([item[0], item[1], "Câu hỏi ≤ " + limits.LIMITS.faq.question + ", trả lời ≤ " + limits.LIMITS.faq.answer]);
  });
  faq.views = [{ state: "frozen", ySplit: 2 }];
  products.dataValidations.add("F3:F400", { type: "list", allowBlank: false, formulae: ['"có,không"'] });
  products.dataValidations.add("L3:L400", { type: "list", allowBlank: false, formulae: ['"jar,box,pouch"'] });
  products.dataValidations.add("M3:M400", {
    type: "list",
    allowBlank: false,
    formulae: ['"' + limits.LIMITS.tones.join(",") + '"']
  });

  await workbook.xlsx.writeFile(xlsxPath);
  console.log("Đã ghi " + path.relative(root, xlsxPath));
  console.log("Ảnh mẫu nằm trong " + limits.LIMITS.image.folder + "/");
}

function STORE_ROWS() {
  return limits.STORE_FIELDS.map(function (field) {
    var max = limits.LIMITS.store[field[0]];
    var note = "Tối đa " + max + " ký tự. " + field[1] + ".";
    if (field[0] === "url_nhan_don") note = "Để trống nếu chưa gắn Google Sheet. Nếu điền thì phải là URL https, tối đa " + max + " ký tự.";
    if (field[0] === "link_shopee") note = "Một link cho cả gian hàng. Mọi nút Shopee trên web mở URL này. Bắt đầu bằng https://";
    return [field[0], seed.store[field[0]], note];
  });
}

main().catch(function (error) {
  console.error(error.message || error);
  process.exit(1);
});
