import type { TranslationKey } from './en';

export const ja: Record<TranslationKey, string> = {
  // ── ナビゲーション ──
  'nav.seer': '予言者',
  'nav.cosmos': '宇宙',
  'nav.chart': 'チャート',
  'nav.bonds': '絆',

  // ── ヘッダー ──
  'header.brand': 'The Seer',

  // ── オンボーディング ──
  'onboarding.the': 'The',
  'onboarding.seer': 'Seer',
  'onboarding.loading': '宇宙を整列中...',
  'onboarding.warnPrecision': '本日のリーディングは精度が低い可能性があります',

  // ── イントロ ──
  'intro.line1': '星々があなたを待っていた',
  'intro.line2': 'あなたのチャート。',
  'intro.line3': 'あなたのオラクル。',
  'intro.line4': 'あなたの真実。',
  'intro.line5': '見るために、あなたがいつ到着したかを知る必要がある',
  'intro.tap': 'タップ',

  // ── 出生データフォーム ──
  'form.title': '予言者はあなたの天体座標を必要としています',
  'form.titleEdit': '天体座標を再調整する',
  'form.name': '名前',
  'form.namePlaceholder': 'あなたの名前',
  'form.date': '生年月日',
  'form.time': '出生時刻',
  'form.place': '出生地',
  'form.placePlaceholder': '入力を開始...',
  'form.noTime': '出生時刻がわからない',
  'form.noTimeHint': '正午が使用されます。アセンダントとハウスの精度が低下する場合がありますが、リーディングは機能します。',
  'form.enter': '確定',
  'form.save': '保存',
  'form.errorDate': '生年月日を入力してください',
  'form.errorCity': '候補から都市を選択してください',

  // ── オラクル ──
  'oracle.acknowledge': '{name}の星図が見える。さあ、聞きなさい。',
  'oracle.sleeping': '呼び出されるまで眠る。',
  'oracle.summon': '召喚',
  'oracle.askAgain': 'もう一度聞く',
  'oracle.ask': '聞く',
  'oracle.deeper': 'オラクルがさらに深く見ている...',
  'oracle.learnMore': 'もっと詳しく',
  'oracle.whyOracle': 'なぜオラクルはそう言うのか？',
  'oracle.whenChange': 'いつ変わるのか？',
  'oracle.exhausted': 'オラクルは語り終えた。新しいリーディングをお求めください。',
  'oracle.copied': 'クリップボードにコピーしました',
  'oracle.timing': 'タイミング',
  'oracle.deeperInsight': '深い洞察',

  // ── オラクルヒント ──
  'hint.oracle': '質問を唱えよ。予言者が答える。',
  'hint.cosmos': 'あなたの日々の宇宙天気',
  'hint.chart': 'あなたの誕生の空、マッピング済み',
  'hint.bonds': 'あなたのチャートを他の魂と比較する',

  // ── 質問プレースホルダー ──
  'q.placeholder1': '私はどんな恋人？',
  'q.placeholder2': '仕事を辞めるべき？',
  'q.placeholder3': '私が主人公？',
  'q.placeholder4': '恋愛で本当に必要なものは？',
  'q.placeholder5': '私の特別な力は？',
  'q.placeholder6': '正しい道を歩いている？',
  'q.placeholder7': '直感を信じるべき？',
  'q.placeholder8': '私は大丈夫？',
  'q.errorEmpty': 'まず質問を唱えよ',
  'q.errorMeaningful': '意味のある質問を',

  // ── 提案された質問 ──
  'suggested.divider': 'または星に選ばせる',

  // ── 予言者の提案質問 ──
  // 恋愛 — 自分のチャートから読み取れる質問
  'sq.loveNature': '私はどんな恋人？',
  'sq.loveNeed': '恋愛で本当に必要なものは？',
  'sq.loveAttract': 'どんな人を引き寄せる？',
  'sq.lovePattern': '恋愛で繰り返すパターンは？',
  'sq.loveReady': '今、恋愛の準備はできてる？',
  'sq.loveDeserve': '私にふさわしい愛は？',
  'sq.tellFeel': '気持ちを伝えるべき？',
  'sq.settlingDown': '妥協してない？',
  'sq.loveBlocking': '恋愛を阻んでいるものは？',
  'sq.whoDrawn': '惹かれる人のタイプは？',

  // キャリア
  'sq.quitJob': '仕事を辞めるべき？',
  'sq.wrongField': '向いていない仕事をしてる？',
  'sq.whatJob': 'どんな仕事が向いている？',
  'sq.payOff': '報われる？',
  'sq.rightMove': 'これは正しい選択？',

  // 自己発見
  'sq.mainCharacter': '私が主人公？',
  'sq.superpower': '私の特別な力は？',
  'sq.hiddenStrength': '私の隠れた強みは？',
  'sq.myCharm': '私の魅力は？',
  'sq.naturallyGifted': '生まれ持った才能は？',

  // 直感と岐路
  'sq.beOkay': '私は大丈夫？',
  'sq.trustGut': '直感を信じるべき？',
  'sq.mistake': '間違いを犯している？',
  'sq.rightPath': 'これは正しい道？',
  'sq.notSeeing': '見えていないものは？',
  'sq.letGo': '手放すべき？',

  // タイミングとスピリチュアル
  'sq.isItTime': '今がその時？',
  'sq.willPass': 'これは過ぎ去る？',
  'sq.focusNow': '今集中すべきことは？',
  'sq.readyFor': '私は何に準備ができている？',

  // ── コスミックダッシュボード ──
  'cosmos.your': 'あなたの',
  'cosmos.title': 'コスミックデイ',
  'cosmos.lunar': '月相',
  'cosmos.transits': 'アクティブなトランジット',
  'cosmos.coming': '今後の動き',
  'cosmos.retrogrades': '逆行中',
  'cosmos.back': '戻る',
  'cosmos.tomorrow': '明日',
  'cosmos.inDays': '{days}日後',
  'cosmos.updated': '{time}に更新',

  // ── 出生チャート ──
  'chart.your': 'あなたの',
  'chart.title': '出生チャート',
  'chart.reading': '予見者の目',
  'chart.keyPoints': 'キーポイント',
  'chart.planets': '惑星',
  'chart.houses': 'ハウス',
  'chart.placidus': 'プラシーダス',
  'chart.wholeSign': 'ホールサイン',
  'chart.house': '第{n}ハウス',

  // ── 惑星の意味 ──
  'planet.sun': 'あなたの核となるアイデンティティ',
  'planet.moon': 'あなたの感情と内面世界',
  'planet.mercury': '思考とコミュニケーションの方法',
  'planet.venus': '愛し方と価値観',
  'planet.mars': '行動力と推進力',
  'planet.jupiter': '幸運と成長の場所',
  'planet.saturn': '規律と人生の教訓',
  'planet.uranus': 'ルールを破る場所',
  'planet.neptune': '夢と直感',
  'planet.pluto': '最も深い変容',
  'planet.ascendant': '世界があなたをどう見るか',
  'planet.midheaven': '社会的イメージとキャリアの方向性',
  'planet.northNode': '魂の方向性',
  'planet.chiron': '最も深い傷と癒しの才能',

  // ── 星座の特質 ──
  'sign.Aries': '大胆、直接的、行動的',
  'sign.Taurus': '安定、感覚的、地に足がついた',
  'sign.Gemini': '好奇心旺盛、適応力、表現力',
  'sign.Cancer': '養育的、直感的、保護的',
  'sign.Leo': '自信に満ちた、創造的、温かい',
  'sign.Virgo': '正確、実用的、献身的',
  'sign.Libra': '調和的、公平、人間関係重視',
  'sign.Scorpio': '激しい、変革的、深い',
  'sign.Sagittarius': '冒険的、哲学的、自由',
  'sign.Capricorn': '野心的、規律正しい、戦略的',
  'sign.Aquarius': '独立的、先見的、型破り',
  'sign.Pisces': '共感的、夢見がち、スピリチュアル',

  // ── チャート質問 ──
  'chartQ.ask': 'チャートについて聞く',
  'chartQ.askAnother': '別の質問をする',
  'chartQ.backToChart': 'チャートに戻る',
  'chartQ.placeholder': 'チャートについて予言者に聞く...',
  'chartQ.orAsk': 'または星に聞く',
  'chartQ.superpower': '私の特別な力は？',
  'chartQ.loveStyle': '私の愛し方は？',
  'chartQ.career': 'どんな仕事が向いている？',
  'chartQ.purpose': '私の使命は？',
  'chartQ.blind': '私の死角は？',
  'chartQ.gift': '私の最大の才能は？',
  'chartQ.shadow': '私の影の部分は？',
  'chartQ.attract': '何を引き寄せる？',
  'chartQ.lesson': '人生の教訓は？',
  'chartQ.fear': '何を恐れている？',
  'chartQ.charm': '何が私を魅力的にする？',
  'chartQ.compatible': '相性の良い星座は？',

  // ── コスモス質問 ──
  'cosmosQ.ask': '今日について聞く',
  'cosmosQ.placeholder': '今日の宇宙天気について予言者に聞く...',
  'cosmosQ.orAsk': 'または今日について聞く',
  'cosmosQ.focusToday': '今日は何に集中すべき？',
  'cosmosQ.feelOff': 'なぜ調子が悪い？',
  'cosmosQ.loveToday': '今日は恋愛に良い日？',
  'cosmosQ.avoidToday': '今日は何を避けるべき？',
  'cosmosQ.bestFor': '今日は何に最適？',
  'cosmosQ.energy': '今日最も強いものは？',

  // ── 相性 / 絆 ──
  'bonds.choose': '比較する魂を選ぶ',
  'bonds.addPrompt': '二人の間に何があるかを明らかにするために第二の魂を追加',
  'bonds.addProfile': '+ プロフィール追加',
  'bonds.chooseAnother': '別の魂を選ぶ',
  'bonds.draws': '二人を引き寄せるもの',
  'bonds.tests': '二人を試すもの',
  'bonds.harmony': 'エレメンタルハーモニー',
  'bonds.resonance': 'コスミックレゾナンス',
  'bonds.askBond': 'この絆について聞く',
  'bonds.backReading': 'リーディングに戻る',
  'bonds.askAnother': '別の質問をする',
  'bonds.placeholder': '私たちはうまくいく？',
  'bonds.orAsk': 'または星に聞く',
  'bonds.strong': '強い',
  'bonds.present': '存在する',
  'bonds.subtle': '微妙',

  // ── 絆の提案質問 ──
  'bondQ.together': '何が私たちを結びつけている？',
  'bondQ.places': 'どんな場所を楽しめる？',
  'bondQ.fight': '何で喧嘩するかも？',
  'bondQ.challenge': '最大の課題は？',
  'bondQ.dates': 'どんなデートが合う？',
  'bondQ.unique': 'この絆のユニークさは？',
  'bondQ.balance': 'どうバランスを取り合っている？',
  'bondQ.compatible': '本当に相性がいい？',
  'bondQ.chemistry': '本当の化学反応はある？',
  'bondQ.last': 'これは続く？',
  'bondQ.trust': '彼らを信じられる？',
  'bondQ.timing': '今が正しい時？',
  'bondQ.serious': '彼らは本気？',

  // ── リーディング履歴 ──
  'history.the': 'オラクルは',
  'history.remembers': '覚えている',
  'history.empty': 'まだリーディングはありません。',
  'history.emptyHint': '予言者に質問して、ジャーナルを始めましょう。',
  'history.yes': 'はい',
  'history.leaningYes': 'おそらくはい',
  'history.uncertain': '不確定',
  'history.leaningNo': 'おそらくいいえ',
  'history.no': 'いいえ',
  'history.unclear': '不明瞭',

  // ── 設定 ──
  'settings.title': '設定',
  'settings.sound': 'サウンド',
  'settings.history': 'リーディング履歴',
  'settings.profiles': 'プロフィール',
  'settings.newProfile': '新しいプロフィール',
  'settings.editProfile': 'プロフィール編集',
  'settings.language': '言語',

  // ── 今日の絆 ──
  'todayBond.energy': '今日のエネルギー',
  'todayBond.happening': '何が起きているか',
  'todayBond.advice': '今日のアドバイス',
  'todayBond.mood': '二人の間のムード：',
  'todayBond.intense': '激しい',
  'todayBond.active': '活発',
  'todayBond.gentle': '穏やか',
  'todayBond.quiet': '静か',

  // ── ムード記述 ──
  'mood.electric': '高エネルギー、帯電',
  'mood.tender': '柔らかい、心が開いている',
  'mood.volatile': '激しい、予測不能',
  'mood.still': '穏やか、待機中',
  'mood.magnetic': '引き寄せ合う',
  'mood.fated': '運命の重さ',
  'mood.restless': '不安、探求中',
  'mood.raw': 'むき出し、フィルターなし',
  'mood.expanding': '成長、開花中',
  'mood.dissolving': '境界が溶けていく',

  // ── ムーンリチュアル ──
  'ritual.newMoon': '新月 — 意図を設定。何を始めるべきか聞こう。',
  'ritual.fullMoon': '満月 — 明晰さを求めよ。何を手放すべきか聞こう。',

  // ── プロフィール ──
  'profile.addProfile': '+ プロフィール追加',

  // ── 一般 ──
  'general.back': '戻る',
  'general.dismiss': '閉じる',
  'general.close': '閉じる',
};
