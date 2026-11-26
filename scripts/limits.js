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
    detailServiceBody: 24,
    maps: 300,
    vi_do: 20,
    kinh_do: 20
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
    specLine: 80,
    maxStores: 12
  },
  outlet: {
    id: 32,
    name: 60,
    area: 60,
    maps: 300,
    max: 30
  },
  arts: ["jar", "box", "pouch"],
  tones: ["lotus", "gift", "coconut", "banana", "matcha", "cashew", "macca", "coffee", "fruit", "moon", "luxury"],
  martTags: ["food", "drink", "spice", "beauty", "fashion", "handicraft", "health", "experience"],
  mart: {
    id: 32,
    name: 60,
    area: 60,
    summary: 140,
    maps: 300,
    file: 80,
    maxTags: 4
  }
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

var PLACE_FIELDS = [
  ["maps", "Link Google Maps của đúng cửa hàng này"],
  ["vi_do", "Vĩ độ"],
  ["kinh_do", "Kinh độ"]
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
  ["mau", "Màu minh họa", "Khi chưa có ảnh: lotus, gift, coconut, banana, matcha, cashew, macca, coffee, fruit, moon, luxury."],
  ["ban_tai", "Bán tại", "Mã ở sheet Điểm bán, cách nhau bởi dấu phẩy. Ví dụ xuong, cua-hang-bien. Tối đa 12 mã. Để trống nếu món chỉ giao tận nơi."]
];

var OUTLET_COLUMNS = [
  ["ma", "Mã", "Tối đa 32 ký tự. Chữ thường, số, gạch ngang. Điền mã này vào cột Bán tại của sản phẩm."],
  ["ten", "Tên", "Tối đa 60 ký tự. Tên hiện cạnh nút cửa hàng trong trang sản phẩm."],
  ["khu_vuc", "Khu vực", "Tối đa 60 ký tự. Ví dụ Hải Châu, Đà Nẵng. Để trống nếu chưa có."],
  ["maps", "Google Maps", "Link https dẫn đường. Tối đa 300 ký tự. Nếu link có @vĩ,kinh thì trang tự lấy tọa độ."],
  ["vi_do", "Vĩ độ", "Số thập phân, ví dụ 16.0544. Chuột phải vào ghim Google Maps rồi chép tọa độ. Để trống nếu link đã có tọa độ."],
  ["kinh_do", "Kinh độ", "Số thập phân, ví dụ 108.2022. Đi cùng vĩ độ."]
];

var MART_COLUMNS = [
  ["ma", "Mã", "Tối đa 32 ký tự. Chữ thường, số, gạch ngang. Đây là đoạn sau dấu / . Ví dụ she-chocolate mở tại /she-chocolate/."],
  ["ten", "Tên", "Tối đa 60 ký tự. Tên hiện trên thẻ cửa hàng."],
  ["khu_vuc", "Khu vực", "Tối đa 60 ký tự. Ví dụ Hải Châu, Đà Nẵng."],
  ["mo_ta", "Mô tả", "Tối đa 140 ký tự. Một câu dưới tên cửa hàng."],
  ["danh_muc", "Danh mục", "Một hoặc nhiều tag, cách nhau bởi dấu phẩy. Chỉ dùng: food, drink, spice, beauty, fashion, handicraft, health, experience. Tối đa 4 tag."],
  ["gian_hang", "Có gian hàng", "Chỉ điền có hoặc không. có = hiện nút Vào gian hàng."],
  ["maps", "Google Maps", "Link https dẫn đường. Để trống nếu chưa có. Tối đa 300 ký tự. Nếu link có tọa độ @vĩ,kinh thì trang tự lấy."],
  ["vi_do", "Vĩ độ", "Số thập phân, ví dụ 16.0544. Chuột phải vào ghim Google Maps rồi chép tọa độ. Để trống nếu chưa có."],
  ["kinh_do", "Kinh độ", "Số thập phân, ví dụ 108.2022. Đi cùng vĩ độ. Dùng để xếp cửa hàng gần khách lên trước."],
  ["du_lieu", "File dữ liệu gian hàng", "Chỉ khi Có gian hàng = có. Đường dẫn trong source, ví dụ constants/generated-store.js. Để trống thì dùng stores/mã/generated-store.js."],
  ["catalog", "File catalog", "Chỉ khi Có gian hàng = có. Ví dụ js/catalog.js. Để trống thì dùng stores/mã/catalog.js."]
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
  PLACE_FIELDS: PLACE_FIELDS,
  PRODUCT_COLUMNS: PRODUCT_COLUMNS,
  OUTLET_COLUMNS: OUTLET_COLUMNS,
  MART_COLUMNS: MART_COLUMNS,
  chars: chars,
  linesOf: linesOf
};
