// Brand stories for the home page (text from the YEIN catalogue, same as the demo).
// Block types: intro | full | split | duo  – rendered by components/home/StoryBlocks.vue
const lensSpecs = (frame, coating = 'Phi cầu, lớp phủ AI xanh ngọc') => [
  { k: 'Gọng kính', v: frame },
  { k: 'Vật liệu tròng', v: 'Tròng nhựa chiết suất cao 1.600, 1.665, 1.738' },
  { k: 'Công nghệ tròng', v: coating },
  { k: 'Đặt riêng', v: 'Tròng trong phạm vi -3.00DS: gia công tăng độ dày tại xưởng Rx' }
]

/**
 * Each story is a list of blocks rendered by StoryBlocks.vue
 * type: intro | full | split | duo
 */
export const stories = [
  {
    id: 'limited',
    theme: 'light',
    blocks: [
      { type: 'full', img: '/img/limited-woman.webp', eyebrow: 'Limited Edition', title: 'YEIN · Bộ sưu tập giới hạn', align: 'right', tone: 'dark', position: '25% center' },
      {
        type: 'split', img: '/img/limited-product.webp', contain: true,
        eyebrow: 'Product display · Mẫu MX-718', title: 'Thời gian tôi luyện, kim cương truyền đời',
        text: 'Như những vì sao dùng góc cạnh khắc lời thì thầm của thời gian, mỗi tia sáng kể một câu chuyện vĩnh hằng. Đó là món quà của thời gian, minh chứng cho đẳng cấp và thanh lịch.',
        specs: lensSpecs('Kim cương, sắt, acetate Ý, gỗ đàn hương, bọc vàng, zircon, vàng K, mạ rhodi')
      },
      { type: 'duo', imgs: ['/img/limited-detail.webp', '/img/h-pink-wide.webp'], title: 'Ánh sáng kín đáo, tinh hoa chế tác truyền đời', text: 'Tuyển chọn vật liệu quý hiếm, tỉ mỉ chế tác hoàn toàn thủ công. Mài giũa đến từng chi tiết nhỏ, theo đuổi sự hoàn mỹ.' }
    ]
  },
  {
    id: 'series-h',
    blocks: [
      { type: 'intro', letter: 'H', en: 'H Series — The brilliant blooming of jewelry art', title: 'Dòng H · Nghệ thuật trang sức rực rỡ tỏa sáng', text: 'Không chỉ hội tụ ánh sáng rực rỡ của zircon và xà cừ, dòng H còn khám phá và tôn vinh những khả năng vô hạn của thiết kế trang sức. Mẫu “Rực rỡ như hoa hạ” thuộc bộ sưu tập Zircon đã trở thành lựa chọn mơ ước của biết bao người.', note: 'Sản phẩm tiêu biểu: Bộ sưu tập Zircon / Bộ sưu tập Bối Ái Nhất Sinh', cta: { label: 'Xem tất cả sản phẩm', to: { name: 'products' } } },
      { type: 'full', img: '/img/h-pink-closeup.webp', eyebrow: 'Zircon Collection', title: 'Rực rỡ như hoa hạ · Tự do tỏa sắc', text: 'Vẻ thanh lịch vượt thời gian kết tinh từ đôi tay nghệ nhân. Tròng kính trang nhã bung nở như cánh hoa, gửi lời thì thầm mùa hoa của YEIN.', align: 'right', tone: 'light' },
      { type: 'split', img: '/img/h-flower.webp', reverse: true, eyebrow: 'Product display · Bộ sưu tập Zircon', title: 'Bung nở như cánh hoa', text: 'Chi tiết zircon đính trên càng kính, tròng nhuộm hồng ánh sương — một món trang sức dành cho đôi mắt.' },
      { type: 'full', img: '/img/h-gold.webp', eyebrow: 'Romantic design', title: 'Lãng mạn trong thiết kế, rực rỡ cùng thời gian', text: 'Như dải ngân hà trút ánh sao lên đường cong gọng kính. Mỗi mặt cắt phản chiếu nguồn cảm hứng bất tận từ trang sức.', align: 'left', tone: 'light', position: 'left center' }
    ]
  },
  {
    id: 'series-y',
    blocks: [
      { type: 'intro', letter: 'Y', en: 'Y Series — A feast of inspiration for designers', title: 'Dòng Y · Bữa tiệc cảm hứng của nhà thiết kế', text: 'Bộ sưu tập Duyệt lấy cảm hứng từ nốt nhạc, đưa sự chuyển động và hài hòa của âm nhạc vào thiết kế. Bộ sưu tập Long Linh được đồng sáng tạo cùng nhà thiết kế Long Tử Gia — sự hòa quyện giữa nghệ thuật và thời trang.', note: 'Sản phẩm tiêu biểu: Điểm Tinh / Duyệt / Long Linh', cta: { label: 'Xem mẫu Dòng Y', to: { name: 'collection', params: { slug: 'dong-y' } } } },
      { type: 'full', img: '/img/y-woman.webp', eyebrow: 'Dot Star Collection', title: 'YEIN · Bộ sưu tập Điểm Tinh', align: 'left', tone: 'light', position: '70% center' },
      { type: 'split', img: '/img/y-mint.webp', eyebrow: 'Định vị thương hiệu', title: 'Sang trọng trí thức · Dịu dàng, rạng rỡ', text: 'Điểm xuyết trang sức cao cấp trên bề mặt tròng. Thể hiện cá tính một cách kín đáo. Chi tiết nhỏ tạo điểm nhấn, tinh tế đến từng nét. Thợ 15 năm kinh nghiệm cắt, mài cạnh tròng hoàn toàn thủ công.', specs: lensSpecs('Kim cương, titan, acetate Ý, zircon') },
      { type: 'split', img: '/img/y-blossom.webp', reverse: true, eyebrow: 'Bộ sưu tập Duyệt', title: 'Giai điệu trên gọng kính', text: 'Nốt nhạc, cánh hoa và những đường cong uyển chuyển — sự chuyển động của âm nhạc được kể lại bằng kim loại quý và tròng ánh hồng.' }
    ]
  },
  {
    id: 'long-linh',
    blocks: [
      { type: 'full', img: '/img/dragon-branch.webp', eyebrow: 'YEIN × Long Tử Gia', title: 'Long hiện linh khí, vạn vật tỏa sáng', text: 'Bằng ngôn ngữ thiết kế trang sức độc đáo, khắc họa tinh hoa văn hóa rồng. Kết hợp thẩm mỹ hiện đại với di sản truyền thống, làm mới nét xưa theo những cách riêng.', align: 'left', tone: 'light', position: 'right center' },
      { type: 'full', img: '/img/dragon-twig.webp', height: 'short', tone: 'none' },
      { type: 'duo', imgs: ['/img/dragon-colors.webp', '/img/dragon-sunset.webp'], title: 'Long Linh · Bộ sưu tập Con đường tơ lụa', text: 'Những sắc màu của hoàng hôn sa mạc trên càng kính titan — rực rỡ, nhẹ nhàng và đầy sức sống.' }
    ]
  },
  {
    id: 'series-f',
    blocks: [
      { type: 'intro', letter: 'F', en: 'F Series — Modern interpretation of Chinese culture', title: 'Dòng F · Diễn giải hiện đại vẻ đẹp phương Đông', text: 'Bộ sưu tập Mặc sử dụng kỹ thuật vẽ nét độc đáo, thể hiện phong vị và chiều sâu của văn hóa truyền thống. Dòng F: nét thanh nhã truyền thống, diễn giải hiện đại, tiếp nối vẻ đẹp văn hóa.', note: 'Sản phẩm tiêu biểu: Bộ sưu tập Vô Song', cta: { label: 'Xem mẫu Dòng F', to: { name: 'collection', params: { slug: 'dong-f' } } } },
      { type: 'full', img: '/img/f-woman.webp', eyebrow: 'Unparalleled Collection', title: 'YEIN · Vô Song gọng mày', align: 'right', tone: 'light', position: '30% center' },
      { type: 'full', img: '/img/f-pearl.webp', eyebrow: 'Oriental charm', title: 'Nhã vận phương Đông, ý cảnh phương Đông', text: 'Thẩm mỹ phương Đông nên thơ, nên họa, nhẹ nhàng chuyển động giữa những đường nét uyển chuyển. Đưa vẻ cổ điển vào thời trang hiện đại.', align: 'left', tone: 'light', position: 'right center' },
      { type: 'split', img: '/img/f-tortoise.webp', eyebrow: 'Định vị thương hiệu · Vô Song', title: 'Đổi mới kỹ thuật tạo màu, định nghĩa lại kính không viền', text: 'Nghệ nhân tạo màu hoàn toàn thủ công. Cùng một dáng tròng vẫn có sắc độ khác biệt tinh tế. Tôn vinh gu thẩm mỹ độc nhất của riêng bạn.', specs: lensSpecs('Titan, acetate Ý', 'Phi cầu, lớp phủ lưu ly ánh sáng dịu') },
      { type: 'duo', imgs: ['/img/f-teal.webp', '/img/f-amber.webp'], title: 'Trẻ trung · Thời trang · Lãng mạn', text: 'Titan nguyên chất: nhẹ, tiện dụng và thoải mái khi đeo. Tròng cắt đa diện trẻ trung, sinh động, dẫn đầu xu hướng.' }
    ]
  }
]

