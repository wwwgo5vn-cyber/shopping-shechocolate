var LIMITS = {
  image: {
    folder: "images",
    minSide: 600,
    targetSide: 800,
    maxSide: 1600,
    maxBytes: 400 * 1024,
    extensions: [".jpg", ".jpeg", ".png", ".webp"]
  },
  store: {
    name: 40,
    mark: 8,
    kind: 40,
    area: 50,
    delivery: 60,
    fee: 40,
    hours: 70,
    promoShipTitle: 36,
    promoShipBody: 40,
    promoPackTitle: 36,
    promoPackBody: 40,
    link_shopee: 120,
    url_nhan_don: 300,
    detailStockTitle: 50,
    detailStockPlace: 40,
    detailShipTitle: 40,
    detailShipBody: 140,
    detailShipPrice: 24,
    detailShipNote: 80,
    detailPickupTitle: 40,
    detailPickupBody: 80,
    detailServiceTitle: 40,
    detailServiceBody: 24
  },
  faq: {
    question: 120,
    answer: 320,
    max: 8
  },
  category: {
    id: 24,
    name: 22
  },
  product: {
    id: 32,
    name: 80,
    menu: 90,
    tasting: 160,
    ingredientLines: 6,
    ingredientLine: 120,
    specLines: 6,
    specLine: 80
  },
  arts: ["jar", "box", "pouch"],
  tones: ["lotus", "gift", "coconut", "banana", "matcha", "cashew", "macca", "coffee", "fruit", "moon", "luxury"]
};

var STORE_FIELDS = [
  ["name", "Tên cửa hàng"],
  ["mark", "Tên viết tắt trên logo"],
  ["kind", "Loại hình"],
  ["area", "Khu vực"],
  ["delivery", "Dòng giao hàng"],
  ["fee", "Dòng phí ship"],
  ["hours", "Dòng hotline"],
  ["promoShipTitle", "Thẻ ưu đãi 1, tiêu đề"],
  ["promoShipBody", "Thẻ ưu đãi 1, dòng nhỏ"],
  ["promoPackTitle", "Thẻ ưu đãi 2, tiêu đề"],
  ["promoPackBody", "Thẻ ưu đãi 2, dòng nhỏ"],
  ["link_shopee", "Link gian hàng Shopee"],
  ["url_nhan_don", "URL nhận đơn Google Sheet"],
  ["detailStockTitle", "Trang chi tiết, dòng còn hàng, tiêu đề"],
  ["detailStockPlace", "Trang chi tiết, dòng còn hàng, chỗ giao"],
  ["detailShipTitle", "Trang chi tiết, giao nhanh, tiêu đề"],
  ["detailShipBody", "Trang chi tiết, giao nhanh, dòng mô tả"],
  ["detailShipPrice", "Trang chi tiết, giao nhanh, phí bên phải"],
  ["detailShipNote", "Trang chi tiết, giao nhanh, dòng miễn phí"],
  ["detailPickupTitle", "Trang chi tiết, nhận tại xưởng, tiêu đề"],
  ["detailPickupBody", "Trang chi tiết, nhận tại xưởng, địa chỉ"],
  ["detailServiceTitle", "Trang chi tiết, chăm sóc khách hàng, tiêu đề"],
  ["detailServiceBody", "Trang chi tiết, chăm sóc khách hàng, số điện thoại"]
];

var PRODUCT_COLUMNS = [
  ["ma", "Mã", "Tối đa 32 ký tự. Chữ thường, số, dấu gạch ngang. Ví dụ hat-sen-hu. Không sửa mã khi món đã có đơn."],
  ["ten", "Tên", "Tối đa 80 ký tự. Hiện ở menu và tiêu đề chi tiết."],
  ["mo_ta_ngan", "Mô tả ngắn", "Tối đa 90 ký tự. Menu chỉ hiện khoảng 2 dòng."],
  ["mo_ta_vi", "Mô tả vị", "Tối đa 160 ký tự. Đoạn dưới giá, trong trang chi tiết."],
  ["gia", "Giá", "Số nguyên, không chấm nghìn. Ví dụ 137000. Để trống thì trang hiện Liên hệ."],
  ["goi", "Bán 1-3-6 gói", "Chỉ điền có hoặc không. có = khách chọn 1 gói, 3 gói, 6 gói."],
  ["danh_muc", "Danh mục", "Mã ở sheet Danh mục, cách nhau bởi dấu phẩy. Ví dụ popular, signature."],
  ["anh", "Ảnh", "Tên file trong thư mục images. Ví dụ hat-sen-hu.jpg. Ảnh vuông 800×800 px. Để trống thì dùng hình minh họa."],
  ["shopee", "Từ khóa Shopee", "Không dùng. Mọi nút Shopee mở link ở sheet Cửa hàng, mã link_shopee."],
  ["thanh_phan", "Thành phần", "Tối đa 6 dòng, mỗi dòng tối đa 120 ký tự. Xuống dòng trong ô để tách ý."],
  ["quy_cach", "Quy cách", "Tối đa 6 dòng, mỗi dòng tối đa 80 ký tự. Xuống dòng trong ô để tách ý."],
  ["kieu_hinh", "Kiểu hình minh họa", "Khi chưa có ảnh: jar, box hoặc pouch."],
  ["mau", "Màu minh họa", "Khi chưa có ảnh: lotus, gift, coconut, banana, matcha, cashew, macca, coffee, fruit, moon, luxury."]
];

function chars(value) {
  return Array.from(String(value || "")).length;
}

function linesOf(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);
}

module.exports = {
  LIMITS: LIMITS,
  STORE_FIELDS: STORE_FIELDS,
  PRODUCT_COLUMNS: PRODUCT_COLUMNS,
  chars: chars,
  linesOf: linesOf
};
