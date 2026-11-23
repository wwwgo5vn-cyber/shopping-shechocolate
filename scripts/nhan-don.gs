function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Đơn hàng");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Đơn hàng");
    sheet.appendRow(["Thời gian", "Họ tên", "Điện thoại", "Địa chỉ", "Ghi chú", "Món", "Tạm tính"]);
  }
  var items = (body.items || []).map(function (item) {
    var pack = item.packLabel ? " " + item.packLabel : "";
    return item.name + pack + " × " + item.qty + " (" + item.lineText + ")";
  }).join(" | ");
  sheet.appendRow([
    new Date(),
    body.name || "",
    body.phone || "",
    body.address || "",
    body.note || "",
    items,
    body.totalText || ""
  ]);
  return ContentService.createTextOutput("ok");
}
