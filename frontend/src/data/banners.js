// Home page banners. Images live in frontend/public/img/banners/.
//  side:  where the caption sits (the empty side of the photo)
//  focus: horizontal position of the model – keeps her in frame when the photo is cropped (mobile)
//  tone:  'light' = white text on a dark photo
export const heroSlides = [
  {
    img: '/img/banners/banner-pearl.webp',
    alt: 'Người mẫu đeo kính không viền YEIN đính đá, váy trắng',
    side: 'right',
    focus: '30%',
    eyebrow: 'YEIN · Kính không viền',
    title: 'Cắt cạnh<br /><em>kim cương</em>',
    text: 'Sáng từng góc nhìn – hơn 300 mẫu gọng thanh mảnh từ ba dòng Hạ Lang Ảnh, Dòng F và Dòng Y.',
    cta: { label: 'Xem sản phẩm', to: '/san-pham' },
  },
  {
    img: '/img/banners/banner-beige.webp',
    alt: 'Người mẫu đeo kính không viền gọng vàng nhạt',
    side: 'left',
    focus: '64%',
    eyebrow: 'Thanh lịch mỗi ngày',
    title: 'Nhẹ như<br /><em>không đeo kính</em>',
    text: 'Gọng mảnh, ôm nhẹ khuôn mặt – hợp cả công sở lẫn dạo phố.',
    cta: { label: 'Khám phá bộ sưu tập', to: '/bo-suu-tap' },
  },
  {
    img: '/img/banners/banner-mint.webp',
    alt: 'Người mẫu đeo kính không viền trên nền xanh bạc hà',
    side: 'left',
    focus: '66%',
    eyebrow: 'Tinh tế không viền',
    title: 'Vẻ đẹp<br /><em>tối giản</em>',
    text: 'Không viền, không giới hạn – để ánh mắt là điểm nhấn.',
    cta: { label: 'Xem mẫu nổi bật', to: '/#san-pham' },
  },
  {
    img: '/img/banners/banner-ink.webp',
    alt: 'Người mẫu đeo kính nửa viền xanh ngọc cùng làn khói mực',
    side: 'right',
    focus: '36%',
    eyebrow: 'Nét Á Đông hiện đại',
    title: 'Mềm mại<br />như <em>nét mực</em>',
    text: 'Cảm hứng thuỷ mặc phương Đông trong từng đường gọng.',
    cta: { label: 'Câu chuyện YEIN', to: '/ve-yein' },
  },
  {
    img: '/img/banners/banner-ruby.webp',
    alt: 'Người mẫu đeo kính đồi mồi trên nền đỏ',
    side: 'right',
    focus: '30%',
    tone: 'light',
    eyebrow: 'Cá tính & sang trọng',
    title: 'Dấu ấn<br /><em>riêng bạn</em>',
    text: 'Tư vấn chọn gọng hợp khuôn mặt miễn phí qua Zalo.',
    cta: { label: 'Nhắn Zalo tư vấn', zalo: true },
  },
]

// "Chi tiết chế tác" mosaic
export const craftShots = [
  { img: '/img/banners/detail-branch.webp', title: 'Thanh mảnh tự nhiên', text: 'Gọng kim loại siêu nhẹ, càng kính bọc màu ngà', wide: true },
  { img: '/img/banners/detail-rose.webp', title: 'Vàng hồng & đá chủ', text: 'Viên đá chủ gắn chấu trên càng kính' },
  { img: '/img/banners/detail-crystal.webp', title: 'Viền đá lấp lánh', text: 'Hàng đá nhỏ đính dọc mép tròng' },
  { img: '/img/banners/detail-signature.webp', title: 'Chữ ký trên mắt kính', text: 'Khắc chữ ký và hoạ tiết đá màu' },
  { img: '/img/banners/detail-blush.webp', title: 'Tròng màu & hoa đá', text: 'Tròng hồng phối hoa bốn cánh đính đá' },
]
