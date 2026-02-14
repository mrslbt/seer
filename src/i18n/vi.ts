import type { TranslationKey } from './en';

export const vi: Record<TranslationKey, string> = {
  // ── Điều hướng ──
  'nav.seer': 'Nhà Tiên Tri',
  'nav.cosmos': 'Vũ Trụ',
  'nav.chart': 'Bản Đồ',
  'nav.bonds': 'Kết Nối',

  // ── Header ──
  'header.brand': 'The Seer',

  // ── Giới thiệu ──
  'onboarding.the': 'The',
  'onboarding.seer': 'Seer',
  'onboarding.loading': 'Đang căn chỉnh vũ trụ...',
  'onboarding.warnPrecision': 'Bài đọc hôm nay có thể kém chính xác hơn',

  // ── Intro ──
  'intro.line1': 'Các vì sao đã chờ đợi bạn',
  'intro.line2': 'Bản đồ sao của bạn.',
  'intro.line3': 'Lời tiên tri của bạn.',
  'intro.line4': 'Sự thật của bạn.',
  'intro.line5': 'Để nhìn thấy, tôi cần biết khi nào bạn đến',
  'intro.tap': 'chạm',

  // ── Form sinh nhật ──
  'form.title': 'Nhà Tiên Tri cần tọa độ thiên thể của bạn',
  'form.titleEdit': 'Điều chỉnh lại tọa độ thiên thể',
  'form.name': 'Tên',
  'form.namePlaceholder': 'Tên của bạn',
  'form.date': 'Ngày sinh',
  'form.time': 'Giờ sinh',
  'form.place': 'Nơi sinh',
  'form.placePlaceholder': 'Bắt đầu nhập...',
  'form.noTime': 'Tôi không biết giờ sinh',
  'form.noTimeHint': 'Sẽ dùng 12 giờ trưa. Cung mọc và nhà có thể kém chính xác, nhưng bài đọc vẫn hoạt động.',
  'form.enter': 'Xác nhận',
  'form.save': 'Lưu',
  'form.errorDate': 'Nhập ngày sinh của bạn',
  'form.errorCity': 'Chọn thành phố từ gợi ý',

  // ── Oracle ──
  'oracle.acknowledge': 'Ta thấy ngươi, {name}.',
  'oracle.acknowledgeAction': 'Hãy hỏi đi.',
  'oracle.sleeping': 'Ta ngủ cho đến khi được triệu hồi.',
  'oracle.summon': 'Triệu hồi',
  'oracle.askAgain': 'Hỏi lại',
  'oracle.ask': 'Hỏi',
  'oracle.deeper': 'Lời tiên tri đang nhìn sâu hơn...',
  'oracle.learnMore': 'Tìm hiểu thêm',
  'oracle.whyOracle': 'Tại sao lời tiên tri nói vậy?',
  'oracle.whenChange': 'Khi nào điều này thay đổi?',
  'oracle.exhausted': 'Lời tiên tri đã nói xong. Hãy hỏi lại để có bài đọc mới.',
  'oracle.copied': 'Đã sao chép',
  'oracle.timing': 'Thời điểm',
  'oracle.deeperInsight': 'Hiểu sâu hơn',

  // ── Gợi ý Oracle ──
  'hint.oracle': 'Nói câu hỏi của bạn. Nhà Tiên Tri sẽ trả lời.',
  'hint.cosmos': 'Thời tiết vũ trụ hàng ngày của bạn',
  'hint.chart': 'Bầu trời lúc sinh, đã được lập bản đồ',
  'hint.bonds': 'So sánh bản đồ sao của bạn với linh hồn khác',

  // ── Placeholder câu hỏi (bầu không khí — không trùng gợi ý) ──
  'q.placeholder1': 'Các vì sao đang lắng nghe...',
  'q.placeholder2': 'Hỏi điều đè nặng trái tim bạn...',
  'q.placeholder3': 'Bạn tìm kiếm sự thật nào?',
  'q.placeholder4': 'Vũ trụ đang chờ câu hỏi của bạn...',
  'q.placeholder5': 'Nói điều bạn cần biết...',
  'q.placeholder6': 'Tâm hồn bạn đang tự hỏi gì?',
  'q.errorEmpty': 'Hãy nói câu hỏi trước',
  'q.errorMeaningful': 'Hãy hỏi một câu có ý nghĩa',

  // ── Câu hỏi gợi ý ──
  'suggested.divider': 'hoặc để sao trời chọn',

  // ── Câu hỏi gợi ý Nhà Tiên Tri ──
  // Tình yêu — trả lời được từ bản đồ sao của người dùng
  'sq.loveNature': 'Tôi là kiểu người yêu nào?',
  'sq.loveNeed': 'Tôi thực sự cần gì trong tình yêu?',
  'sq.loveAttract': 'Tôi thu hút kiểu người nào?',
  'sq.lovePattern': 'Tôi lặp lại mô hình gì trong tình yêu?',
  'sq.loveReady': 'Tôi có sẵn sàng cho tình yêu bây giờ?',
  'sq.loveDeserve': 'Tôi xứng đáng với tình yêu nào?',
  'sq.tellFeel': 'Tôi có nên nói ra cảm xúc?',
  'sq.settlingDown': 'Tôi có đang chấp nhận tạm bợ?',
  'sq.loveBlocking': 'Điều gì đang cản trở tình yêu?',
  'sq.whoDrawn': 'Tôi bị thu hút bởi ai?',

  // Sự nghiệp
  'sq.quitJob': 'Tôi có nên nghỉ việc?',
  'sq.wrongField': 'Tôi có đang sai ngành?',
  'sq.whatJob': 'Tôi nên làm công việc gì?',
  'sq.payOff': 'Điều này có được đền đáp?',
  'sq.rightMove': 'Đây có phải bước đi đúng?',

  // Khám phá bản thân
  'sq.mainCharacter': 'Tôi có phải nhân vật chính?',
  'sq.superpower': 'Siêu năng lực của tôi là gì?',
  'sq.hiddenStrength': 'Sức mạnh ẩn giấu của tôi là gì?',
  'sq.myCharm': 'Sức hút của tôi là gì?',
  'sq.naturallyGifted': 'Tôi có năng khiếu gì bẩm sinh?',

  // Linh cảm và ngã rẽ
  'sq.beOkay': 'Tôi sẽ ổn chứ?',
  'sq.trustGut': 'Tôi có nên tin linh cảm?',
  'sq.mistake': 'Tôi có đang mắc sai lầm?',
  'sq.rightPath': 'Đây có phải con đường đúng?',
  'sq.notSeeing': 'Tôi đang không thấy gì?',
  'sq.letGo': 'Tôi có nên buông bỏ?',

  // Thời điểm và tâm linh
  'sq.isItTime': 'Đã đến lúc chưa?',
  'sq.willPass': 'Điều này có qua đi?',
  'sq.focusNow': 'Bây giờ nên tập trung vào gì?',
  'sq.readyFor': 'Tôi đã sẵn sàng cho điều gì?',

  // ── Bảng điều khiển vũ trụ ──
  'cosmos.your': 'Của bạn',
  'cosmos.title': 'Ngày Vũ Trụ',
  'cosmos.lunar': 'Pha Trăng',
  'cosmos.transits': 'Quá cảnh đang hoạt động',
  'cosmos.coming': 'Sắp tới',
  'cosmos.retrogrades': 'Nghịch hành',
  'cosmos.back': 'Quay lại',
  'cosmos.tomorrow': 'ngày mai',
  'cosmos.inDays': 'trong {days} ngày',
  'cosmos.updated': 'Cập nhật {time}',

  // ── Bản đồ sao ──
  'chart.your': 'Của bạn',
  'chart.title': 'Bản đồ sao lúc sinh',
  'chart.reading': 'Nhà tiên tri nhìn thấy',
  'chart.keyPoints': 'Điểm chính',
  'chart.planets': 'Hành tinh',
  'chart.houses': 'Nhà',
  'chart.placidus': 'Placidus',
  'chart.wholeSign': 'Whole Sign',
  'chart.house': 'nhà {n}',

  // ── Ý nghĩa hành tinh ──
  'planet.sun': 'Bản sắc cốt lõi của bạn',
  'planet.moon': 'Cảm xúc và thế giới nội tâm',
  'planet.mercury': 'Cách bạn suy nghĩ và giao tiếp',
  'planet.venus': 'Cách bạn yêu và điều bạn trân trọng',
  'planet.mars': 'Động lực và cách bạn hành động',
  'planet.jupiter': 'Nơi bạn tìm thấy may mắn và phát triển',
  'planet.saturn': 'Kỷ luật và bài học cuộc sống',
  'planet.uranus': 'Nơi bạn phá vỡ quy tắc',
  'planet.neptune': 'Giấc mơ và trực giác',
  'planet.pluto': 'Sự biến đổi sâu sắc nhất',
  'planet.ascendant': 'Thế giới nhìn bạn thế nào',
  'planet.midheaven': 'Hình ảnh công cộng và hướng sự nghiệp',
  'planet.northNode': 'Hướng đi của linh hồn',
  'planet.chiron': 'Vết thương sâu nhất và khả năng chữa lành',

  // ── Đặc tính cung ──
  'sign.Aries': 'táo bạo, trực tiếp, hành động',
  'sign.Taurus': 'vững vàng, nhạy cảm, tiếp đất',
  'sign.Gemini': 'tò mò, thích nghi, biểu cảm',
  'sign.Cancer': 'nuôi dưỡng, trực giác, bảo vệ',
  'sign.Leo': 'tự tin, sáng tạo, ấm áp',
  'sign.Virgo': 'chính xác, thực tế, tận tụy',
  'sign.Libra': 'hài hòa, công bằng, hướng quan hệ',
  'sign.Scorpio': 'mãnh liệt, biến đổi, sâu sắc',
  'sign.Sagittarius': 'phiêu lưu, triết học, tự do',
  'sign.Capricorn': 'tham vọng, kỷ luật, chiến lược',
  'sign.Aquarius': 'độc lập, tầm nhìn xa, phi quy ước',
  'sign.Pisces': 'đồng cảm, mơ mộng, tâm linh',

  // ── Câu hỏi bản đồ sao ──
  'chartQ.ask': 'Hỏi về bản đồ sao',
  'chartQ.askAnother': 'Hỏi câu khác',
  'chartQ.backToChart': 'Quay lại bản đồ',
  'chartQ.placeholder': 'Hỏi Nhà Tiên Tri về bản đồ sao...',
  'chartQ.orAsk': 'hoặc hỏi các vì sao',
  'chartQ.superpower': 'Siêu năng lực của tôi là gì?',
  'chartQ.loveStyle': 'Tôi yêu như thế nào?',
  'chartQ.career': 'Nghề nghiệp nào phù hợp?',
  'chartQ.purpose': 'Mục đích sống của tôi là gì?',
  'chartQ.blind': 'Điểm mù của tôi là gì?',
  'chartQ.gift': 'Tài năng lớn nhất của tôi là gì?',
  'chartQ.shadow': 'Mặt tối của tôi là gì?',
  'chartQ.attract': 'Tôi thu hút điều gì?',
  'chartQ.lesson': 'Bài học cuộc đời tôi là gì?',
  'chartQ.fear': 'Tôi sợ điều gì?',
  'chartQ.charm': 'Điều gì khiến tôi cuốn hút?',
  'chartQ.compatible': 'Cung nào hợp với tôi nhất?',

  // ── Câu hỏi vũ trụ ──
  'cosmosQ.ask': 'Hỏi về ngày của bạn',
  'cosmosQ.placeholder': 'Hỏi Nhà Tiên Tri về ngày vũ trụ...',
  'cosmosQ.orAsk': 'hoặc hỏi về hôm nay',
  'cosmosQ.focusToday': 'Hôm nay nên tập trung vào gì?',
  'cosmosQ.feelOff': 'Tại sao tôi cảm thấy lạ?',
  'cosmosQ.loveToday': 'Hôm nay có tốt cho tình yêu?',
  'cosmosQ.avoidToday': 'Hôm nay nên tránh gì?',
  'cosmosQ.bestFor': 'Hôm nay tốt nhất cho gì?',
  'cosmosQ.energy': 'Điều gì mạnh nhất hôm nay?',

  // ── Tương hợp / Kết nối ──
  'bonds.choose': 'Chọn một linh hồn để so sánh',
  'bonds.addPrompt': 'Thêm linh hồn thứ hai để khám phá điều giữa hai bạn',
  'bonds.addProfile': '+ Thêm hồ sơ',
  'bonds.chooseAnother': 'Chọn linh hồn khác',
  'bonds.draws': 'Điều kéo hai bạn lại gần',
  'bonds.tests': 'Điều thử thách hai bạn',
  'bonds.harmony': 'Hài hòa nguyên tố',
  'bonds.resonance': 'Cộng hưởng vũ trụ',
  'bonds.askBond': 'Hỏi về mối liên kết này',
  'bonds.backReading': 'Quay lại bài đọc',
  'bonds.askAnother': 'Hỏi câu khác',
  'bonds.placeholder': 'Chúng tôi có hợp nhau?',
  'bonds.orAsk': 'hoặc hỏi các vì sao',
  'bonds.strong': 'mạnh',
  'bonds.present': 'hiện diện',
  'bonds.subtle': 'tinh tế',

  // ── Câu hỏi gợi ý về kết nối ──
  'bondQ.together': 'Điều gì kết nối chúng tôi?',
  'bondQ.places': 'Những nơi nào chúng tôi sẽ thích?',
  'bondQ.fight': 'Chúng tôi có thể tranh cãi về gì?',
  'bondQ.challenge': 'Thách thức lớn nhất là gì?',
  'bondQ.dates': 'Kiểu hẹn hò nào phù hợp?',
  'bondQ.unique': 'Điều gì làm mối liên kết này độc đáo?',
  'bondQ.balance': 'Chúng tôi cân bằng nhau thế nào?',
  'bondQ.compatible': 'Chúng tôi thực sự hợp nhau?',
  'bondQ.chemistry': 'Có hóa học thực sự giữa chúng tôi?',
  'bondQ.last': 'Điều này có kéo dài?',
  'bondQ.trust': 'Tôi có thể tin họ?',
  'bondQ.timing': 'Bây giờ có phải lúc?',
  'bondQ.serious': 'Họ có nghiêm túc?',

  // ── Lịch sử đọc ──
  'history.the': 'Lời Tiên Tri',
  'history.remembers': 'Ghi Nhớ',
  'history.empty': 'Chưa có bài đọc nào.',
  'history.emptyHint': 'Hỏi Nhà Tiên Tri một câu để bắt đầu nhật ký.',
  'history.yes': 'Có',
  'history.leaningYes': 'Nghiêng về Có',
  'history.uncertain': 'Không chắc',
  'history.leaningNo': 'Nghiêng về Không',
  'history.no': 'Không',
  'history.unclear': 'Không rõ ràng',

  // ── Cài đặt ──
  'settings.title': 'Cài đặt',
  'settings.sound': 'Âm thanh',
  'settings.history': 'Lịch sử đọc',
  'settings.profiles': 'Hồ sơ',
  'settings.newProfile': 'Hồ sơ mới',
  'settings.editProfile': 'Sửa hồ sơ',
  'settings.language': 'Ngôn ngữ',

  // ── Chân trang ──
  'footer.terms': 'Điều khoản',
  'footer.privacy': 'Quyền riêng tư',
  'footer.disclaimer': 'Để suy ngẫm, không phải tiên đoán.',

  // ── Năng lượng hôm nay ──
  'todayBond.energy': 'Năng lượng hôm nay',
  'todayBond.happening': 'Đang xảy ra',
  'todayBond.advice': 'Lời khuyên hôm nay',
  'todayBond.mood': 'Tâm trạng giữa hai bạn:',
  'todayBond.intense': 'mãnh liệt',
  'todayBond.active': 'năng động',
  'todayBond.gentle': 'nhẹ nhàng',
  'todayBond.quiet': 'yên tĩnh',

  // ── Mô tả tâm trạng ──
  'mood.electric': 'năng lượng cao, tích điện',
  'mood.tender': 'dịu dàng, mở lòng',
  'mood.volatile': 'mãnh liệt, khó đoán',
  'mood.still': 'yên bình, chờ đợi',
  'mood.magnetic': 'hút nhau',
  'mood.fated': 'nặng nề với định mệnh',
  'mood.restless': 'bất an, tìm kiếm',
  'mood.raw': 'phơi bày, không lọc',
  'mood.expanding': 'đang lớn lên, mở ra',
  'mood.dissolving': 'ranh giới đang tan',

  // ── Nghi lễ mặt trăng ──
  'ritual.newMoon': 'Trăng mới — Đặt ý định. Hỏi nên bắt đầu gì.',
  'ritual.fullMoon': 'Trăng tròn — Tìm sự rõ ràng. Hỏi nên buông bỏ gì.',

  // ── Hồ sơ ──
  'profile.addProfile': '+ Thêm hồ sơ',

  // ── Giới hạn tầm nhìn ──
  'vision.twoCast': 'Hai tầm nhìn đã hiện hôm nay \u00B7 Còn một',
  'vision.oneLeft': 'Còn một tầm nhìn. Hãy hỏi với chủ đích.',
  'vision.generous': 'Nhà Tiên Tri đã hào phóng hôm nay.',
  'vision.noLimit': 'Giai đoạn thử nghiệm \u00B7 Chế độ không giới hạn',

  // ── Chung ──
  'general.back': 'Quay lại',
  'general.dismiss': 'Đóng',
  'general.close': 'Đóng',
};
