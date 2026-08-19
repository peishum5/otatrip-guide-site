# Refactor Instructions — OTAtrip Guide SITE

> 実装担当モデルへ: このドキュメントが唯一の指示書です。ここに書かれていない大規模変更は行わないでください。
> 不明点は「Stop And Ask Conditions」に従って必ず停止して質問してください。

---

## Objective

既存の挙動・URL・SEO 出力・予約導線を一切壊さずに、以下を達成する:

1. 確認済みの実バグ(ページタイトルのブランド名二重付与)を修正する
2. 死んでいるコード/古い情報源(未使用の tours コンテンツコレクション)を整理する
3. 複数箇所に重複したデータ(ツアー情報・Bokun UUID・連絡先メール)を単一の情報源に集約する
4. 検証手段(typecheck・CI)が存在しない状態を解消する

「見た目を綺麗にする」「全部書き直す」は目的ではない。**変更は小さく、根拠があるものだけ。**

---

## Project Understanding

### 何のサイトか

京都・祇園のローカルガイドツアー会社「OTAtrip Guide」(運営: Cosmic Magic)の集客サイト。
NES/ファミコン風ピクセルアートのダークテーマ(アンバー #ffb000 + シアン #00e5ff、Press Start 2P フォント)が全ページのブランドアイデンティティ。

### 技術スタック

- **Astro 5** (`output: 'static'`、全53ページ静的生成) + `@astrojs/vercel` アダプタ
- **Tailwind CSS v4** (`@tailwindcss/vite` プラグイン、テーマは `src/styles/global.css` の `@theme` ブロック)
- **MDX** ブログ記事 (`src/content/blog/` 配下、カテゴリ別フォルダ)
- ホスティング: Vercel(`main` ブランチ push で本番自動デプロイ)。**main への push は即本番反映**である点に注意
- パッケージマネージャ: npm(package-lock.json あり)
- テスト・lint・typecheck・CI: **一切なし**(検証は `npm run build` と目視のみ)

### 主要なユーザー体験

1. **ツアー予約(収益導線)**: ツアー詳細ページ → Bokun ウィジェット(`widgets.bokun.io`)で予約。これが最重要フロー
2. **ブログ(SEO 集客)**: 30本超の MDX ガイド記事 → 記事内 CTA からツアーへ誘導
3. **ミニゲーム**: `src/components/GionQuest.astro`(約1,000行の canvas ゲーム)。`/` と `/game` の両方に埋め込み。クリア画面からツアー予約へ誘導
4. **グループ/法人問い合わせ**: `/groups` → mailto リンク(フォームなし)

### エントリーポイントと主要モジュール

| パス | 責務 |
|---|---|
| `src/layouts/BaseLayout.astro` | 全ページ共通の head(meta/OG/JSON-LD/GA4/フォント)。**タイトル組み立てロジックにバグあり(後述 D1)** |
| `src/layouts/BlogLayout.astro` | ブログ記事レイアウト + Article/Breadcrumb/FAQ の JSON-LD |
| `src/pages/index.astro` | ホーム。ヒーロー(タイプライター演出)+ ゲーム埋め込み + ツアーティーザー(**ツアー情報ハードコード**) |
| `src/pages/tours/*.astro` | ツアー詳細3枚(gion-sake-walk / izakaya-hopping / shimogamo-manga-walk)。各自にタイムライン・FAQ・Bokun ウィジェット・JSON-LD を**ほぼ同じ構造でコピー**して保持 |
| `src/pages/blog/[...slug].astro` | ブログ動的ルート。`getCollection('blog')` → `BlogLayout` |
| `src/pages/sitemap.xml.ts` | sitemap 生成。静的ルートは `STATIC_ROUTES` 配列に**手動列挙** |
| `src/components/GionQuest.astro` | ミニゲーム本体(マークアップ+CSS+ゲームエンジン一体、1,035行) |
| `src/components/BookingWidget.astro` | Bokun ウィジェット埋め込み(channelUUID をここにもハードコード) |
| `src/utils/blog.ts` | ブログのカテゴリ判定・ソート・slug 正規化 |
| `src/content/config.ts` | コンテンツコレクション定義。**`tours` コレクションは定義されているがどこからも読まれていない** |
| `scripts/ga4/*.mjs` | GA4 分析 CLI(サイトビルドとは独立。`.env` + サービスアカウント鍵が必要) |
| `scripts/optimize-images.mjs` | 画像一括最適化(**sharp に依存するが package.json に未宣言**) |

### データフロー

- ブログ: MDX frontmatter(zod schema)→ `[...slug].astro` → `BlogLayout`。カテゴリは frontmatter または slug プレフィックスから導出(`src/utils/blog.ts:15-22`)
- ツアー: **コンテンツコレクションを経由せず**、各 `.astro` ページにデータ直書き。ホーム(`index.astro`)とツアー一覧(`tours/index.astro`)にも同じツアーの価格・時間・人数が別々にハードコードされている
- 予約: Bokun のローダー script を各ツアーページの `<Fragment slot="head">` で読み込み + `BookingWidget.astro` が iframe を描画。channelUUID `f23bdb2c-1b09-450d-bc03-a0a0b23700e9` が**4ファイルに重複**
- 計測: GA4 (`G-7NL28Z41JD`) を `BaseLayout` に直書き(PROD ビルドのみ)

### 外部依存(壊すと実害が出る境界)

1. **Bokun**(予約ウィジェット)— channelUUID と experience ID(901507 ほか)。変更禁止
2. **GA4** — 計測 ID。変更禁止
3. **TripAdvisor** — レビューリンク(`ReviewsSection.astro`)
4. **Google Maps** — 集合場所リンク(`maps.app.goo.gl/...`)
5. **Google Fonts** — Press Start 2P / Inter

---

## Behaviors To Preserve(絶対に壊さないこと)

1. **全 URL/ルート**: 53ページのパスを1つも変えない(SEO 資産)。`dist/` のページ一覧がビルド前後で一致すること
2. **Bokun 予約ウィジェット**: 3つのツアーページでウィジェットが読み込まれること(channelUUID・experience ID・ローダー script の挙動を変えない)
3. **ミニゲーム(GionQuest)の全挙動**: タイトル画面 → スタート → NPC会話(タイプライター)→ スタンプ3つ → クリア画面 → ベストタイム保存。localStorage キー `gq-best` / `gq-mute` の名前を変えない(既存ユーザーの記録が消える)。`/` と `/game` の両方で動くこと
4. **ブログのレンダリング**: 全 MDX 記事、カテゴリページ、関連記事、FAQ JSON-LD、canonical
5. **sitemap.xml の出力内容**(URL 集合が等価であること)
6. **`noIndex` 付き記事の robots 挙動**(`guest/` ページ含む)
7. **JSON-LD 構造化データ**(Organization / WebSite / Article / BreadcrumbList / FAQPage / TouristAttraction)— D1 の承認済み文字列修正を除き、構造を変えない
8. **ピクセルアートの視覚テーマ**: global.css のクラス(`nes-btn`, `dialogue-box`, `scanlines` 等)の見た目
9. **GA4 計測**(PROD のみ読み込まれる条件を含む)

---

## Non-Negotiables(作業ルール)

- 最初に `git status` を確認する。**既存の未コミット変更(`.claude/` や本ファイル等)と自分の変更を混ぜない**
- 編集前に baseline の検証結果(ビルド成功・ページ数・主要ページの `<title>`)を記録する
- 変更は小さく、フェーズごとに独立して revert 可能な単位でコミットする
- 無関係な整形・リネーム・「ついで」のリファクタリングをしない(diff を汚さない)
- 既存挙動を勝手に変えない。「正しい仕様」が複数候補ある場合は実装せず質問する
- 証拠なく大きな削除・全面書き換えをしない。削除は本書で明示されたものだけ
- 各フェーズ完了ごとに Verification Requirements を実行する
- `main` への直接 push はしない(本番直結)。作業ブランチで進める

---

## Stop And Ask Conditions(停止して質問する条件)

以下に該当したら実装を止めて人間に質問すること:

1. ツアーの**実仕様**(価格・所要時間・最大人数・集合場所・開始時刻)に関わる矛盾を解消するとき、どちらが正かコードから判断できない場合(→ 下記「実装前に確認すべき質問」Q1 が未回答の場合、Phase 4-5 に入らない)
2. ブランド表記(Q2)が未回答の場合、Phase 3 に入らない
3. JSON-LD の `aggregateRating`(reviewCount: 200)など、**対外的な主張を含むデータ**を変更したくなった場合
4. 公開 URL、canonical、OG 画像、robots/noIndex に影響しうる変更
5. Bokun・GA4・TripAdvisor・Google Maps など外部連携の ID/URL に触れる変更
6. `src/content/blog/` の記事本文・frontmatter を変更したくなった場合(本書のスコープ外)
7. 削除候補のコードについて、本書に明示されていない参照を発見した場合

---

## Baseline Commands

```sh
git status                 # 作業前の状態を記録(untracked の .claude/ 等は触らない)
npm install                # 依存導入
npm run build              # 現状 53 ページが成功する。ページ数とエラー有無を記録
npx astro dev              # 手動スモーク用(/, /game, /tours/gion-sake-walk, /blog 配下1記事)
```

- テストは存在しない。**`npm run build` の成功 + dist の差分比較がこのリポジトリの実質的な回帰テスト**である
- baseline として `npm run build` 後に以下を保存しておくこと:
  ```sh
  find dist -name "*.html" | sort > /tmp/baseline-pages.txt
  grep -roh "<title>[^<]*</title>" dist > /tmp/baseline-titles.txt
  ```
- `scripts/ga4/` は GA4 認証情報(`.env` + サービスアカウント鍵)がないと動かない。**動作確認不要、触らない**

---

## Debt Map

各項目: 根拠 → 問題 → 影響/リスク → 改善案 → 検証 → 実装可否

### D1. ページタイトルのブランド名二重付与(実バグ・本番露出中)

- **根拠**: `src/layouts/BaseLayout.astro:34` — `title.includes('OTA Trip Guide')` でチェックしているが、実際に各ページが渡すブランド表記は `OTAtrip Guide`(スペースなし)。そのため条件が常に false になり全ページで `| OTA Trip Guide` が追記される。ビルド済み `dist/game/index.html` で実測: `<title>Gion Night Quest | OTAtrip Guide | OTA Trip Guide</title>`。さらに `og:site_name` は `OTA Trip Guide`(`BaseLayout.astro:54`)、JSON-LD の Organization 名は `OTAtrip Guide`(`:70`)と表記揺れ
- **問題**: 全ページの `<title>` にブランドが二重表示。SEO・SNS シェア・ブックマーク表示の品質劣化
- **影響範囲**: 全53ページの head
- **リスク**: 低(文字列ロジックの修正)。ただし正しいブランド表記の決定はプロダクト判断
- **改善案**: ブランド表記を1定数に統一(例: `src/config/site.ts` に `SITE_NAME`)。`fullTitle` は「すでに SITE_NAME を含むならそのまま、含まなければ `${title} | ${SITE_NAME}`」とし、`og:site_name`・JSON-LD・Footer/Header の表記も同じ定数を参照
- **検証**: ビルド後 `grep -roh "<title>[^<]*</title>" dist | grep -c "| OTAtrip Guide | OTA Trip Guide"` が 0。タイトルにブランドが正確に1回含まれること
- **実装可否**: **Q2 回答後に実装可**(Phase 3)

### D2. 未使用の tours コンテンツコレクション(死コード+古い偽情報)

- **根拠**: `src/content/config.ts:26-34` で `tours` コレクションを定義、`src/content/tours/gion-sake-walk.md` が存在するが、`getCollection('tours')` の参照は**リポジトリ内に0件**(grep 済み)。しかもこの md の内容は「From ¥8,000 / 3 hours / Max 8 / 集合: Gion-Shijo Station exit 6」で、実ページ `src/pages/tours/gion-sake-walk.astro` の「from ¥5,600 / 90 min / Max 10 / 集合: Shijo Kiyamachi」と**全項目で矛盾**
- **問題**: 読まれないのに「もっともらしい偽スペック」を持つファイルが残っており、将来の編集者(人間/AI)が誤って参照する温床
- **影響範囲**: ビルド出力には影響なし(未参照のため)
- **リスク**: 削除自体は低。ただし「将来コレクション化する構想で置いた」可能性があるため確認が必要
- **改善案**: `src/content/tours/` ディレクトリと `config.ts` の tours コレクション定義を削除
- **検証**: `npm run build` 成功、ページ数 53 のまま、`getCollection('tours')` 参照が増えていないこと
- **実装可否**: **Q1 回答後に実装可**(Phase 4)

### D3. ツアー基本情報が3箇所以上に重複し、すでに矛盾している

- **根拠**:
  - `src/pages/index.astro:293` ティーザー: gion-sake-walk は「**3 hrs** · Max 10 · from ¥5,600」
  - `src/pages/tours/gion-sake-walk.astro:71,99` 詳細: 「**90 min** / Max 10 / from ¥5,600 / 4 daily slots」
  - `src/pages/tours/index.astro:11-15`: 「Max 10 guests / from ¥5,600」
  - (削除予定の `content/tours/*.md` は第4の値を持つ)
- **問題**: 所要時間がホームと詳細で既に矛盾(3 hrs vs 90 min)。価格改定時に直し漏れが構造的に発生する
- **影響範囲**: ホーム・ツアー一覧・ツアー詳細・(JSON-LD の description 文言)
- **リスク**: 中。表示文字列の集約なので機械的だが、**どちらの値が正しいかはプロダクト判断**(Q1)
- **改善案**: `src/data/tours.ts` を新設し、ツアーごとに `{ slug, name, tag, icon, price, duration, maxGuests, language, startTimes, meta... }` を1箇所で定義。`index.astro` のティーザー、`tours/index.astro` のカード、各詳細ページのヒーロー統計をここから参照する。**文言の値は Q1 の回答で確定したものを使う**
- **検証**: ビルド後、3ページの表示値が確定仕様と一致し、相互に矛盾しないこと。dist diff で意図した文字列変更のみであること
- **実装可否**: **Q1 回答後に実装可**(Phase 5)

### D4. Bokun channelUUID の4重複

- **根拠**: `src/components/BookingWidget.astro:8` と、3つのツアーページの head 内ローダー script(`gion-sake-walk.astro:76`、`izakaya-hopping.astro`、`shimogamo-manga-walk.astro`)に同じ UUID `f23bdb2c-1b09-450d-bc03-a0a0b23700e9` がリテラルで埋まっている
- **問題**: チャネル変更時に4箇所の同期が必要。漏れると予約導線が静かに壊れる
- **影響範囲**: 予約ウィジェット(収益直結)
- **リスク**: 低(値を変えず参照を1本化するだけ)
- **改善案**: `src/config/site.ts` に `BOKUN_CHANNEL_UUID` を定義し、`BookingWidget.astro` とローダー script の src 組み立てで参照。可能ならローダー script タグ自体を `BookingWidget` か小さな `BokunLoader.astro` に寄せ、各ツアーページの `<Fragment slot="head">` から使う
- **検証**: ビルド後 dist の該当3ページに UUID が**変更前と同一の値**で出力されていること(`grep -r "f23bdb2c" dist | wc -l` が前後で等しい)。dev サーバーでウィジェット iframe が表示されること
- **実装可否**: **実装可**(Phase 2)

### D5. 連絡先メールアドレスの分散ハードコード

- **根拠**: `kyoto.otatrip.guide@gmail.com` が `Footer.astro`(2箇所)、`contact.astro`(2)、`groups.astro`(2)、`guest/gion-night-walk-meeting-point.astro`(3)に直書き
- **問題**: 運営者は近く独自ドメインのメールアドレスへ移行予定(確定情報)。現状だと9箇所の置換が必要で漏れリスクが高い
- **影響範囲**: 問い合わせ導線
- **リスク**: 低
- **改善案**: `src/config/site.ts` に `CONTACT_EMAIL` を定義して全箇所で参照(**値は現行の gmail のまま変えない**。切替は将来、定数1行の変更で済むようにするのが目的)
- **検証**: ビルド後 `grep -ro "kyoto.otatrip.guide@gmail.com" dist | wc -l` が前後で一致(出力は不変)
- **実装可否**: **実装可**(Phase 2)

### D6. ツアーページ間のセクション構造コピー

- **根拠**: `tours/gion-sake-walk.astro`(340行)・`izakaya-hopping.astro`(248行)・`shimogamo-manga-walk.astro`(313行)が「セクション見出し(h2+罫線)/ハイライトグリッド/タイムライン/FAQ details/JSON-LD」をほぼ同型のマークアップで各自実装
- **問題**: デザイン調整・FAQ schema 変更のたびに3箇所同期が必要
- **影響範囲**: ツアー詳細3ページ
- **リスク**: 中。マークアップ抽出は視覚回帰を起こしやすい
- **改善案**: 小さく刻む — `SectionHeading.astro`(見出し+罫線)、`FaqList.astro`(details リスト)、`TourTimeline.astro`(タイムライン行)を抽出し、3ページから利用。ページ固有のデータ(timeline 配列・faqs 配列)はページ側に残してよい
- **検証**: ビルド前後の dist HTML diff が「クラス構造が等価」であること(理想は文字単位で一致)。dev サーバーで3ページを目視確認
- **実装可否**: **実装可だが Phase 6(最後)**。1コンポーネントずつコミットを分ける

### D7. 検証インフラ(typecheck/CI)の不在

- **根拠**: `package.json` に build/dev/preview と ga4 系スクリプトのみ。`@astrojs/check` 未導入、`.github/workflows` なし、テストなし
- **問題**: `tsconfig.json` は `astro/tsconfigs/strict` を extend しているのに型検査が一度も走っていない。main 直 push = 本番なのに自動検証ゼロ
- **影響範囲**: 開発プロセス全体
- **リスク**: 低(追加のみ)。ただし**初回の `astro check` は既存エラーを多数報告する可能性がある** — その場合、既存エラーの修正はスコープ外とし、件数を記録して報告に含めるだけにする(エラーを直そうとして挙動を変えない)
- **改善案**: ① `@astrojs/check` + `typescript` を devDependencies に追加し `"check": "astro check"` スクリプトを定義 ② `.github/workflows/ci.yml` を新設し PR で `npm ci && npm run build` を実行(check は既存エラーが0なら必須化、あるなら警告扱い)
- **検証**: CI が PR 上で green になること。`npm run build` がローカルで成功すること
- **実装可否**: **実装可**(Phase 1 — 安全網として最初にやる)

### D8. scripts/optimize-images.mjs の未宣言依存(sharp)

- **根拠**: `scripts/optimize-images.mjs:18` が `import sharp from 'sharp'` するが、`package.json` の dependencies/devDependencies に sharp がない(node_modules には残骸として存在)
- **問題**: クリーンクローンでスクリプトが `ERR_MODULE_NOT_FOUND` で死ぬ
- **影響範囲**: 画像最適化スクリプトのみ(サイトビルドには無関係)
- **リスク**: 低
- **改善案**: `sharp` を devDependencies に追加(バージョンは `npm ls sharp` で現在 node_modules にあるメジャーに合わせる)。スクリプト自体は変更しない
- **検証**: クリーン環境相当で `node scripts/optimize-images.mjs --dry-run` がエラーなく走る(dry-run なので画像は変更されない)
- **実装可否**: **実装可**(Phase 2)

### D9. GionQuest.astro の1,035行モノリス

- **根拠**: `src/components/GionQuest.astro` — マークアップ・CSS・マップデータ・ゲームエンジン・スプライト描画・音声・入力・会話データが1ファイル
- **問題**: 可読性とテスト容易性。ただし**直近で全面検証済み・本番稼働中・自動テストなし**
- **影響範囲**: `/` と `/game`
- **リスク**: **高**。canvas ゲームは自動回帰検証ができず、分割時の細かいスコープ/初期化順の変化で壊れても気づきにくい
- **改善案(提案のみ)**: 将来やるなら `src/game/` 配下に engine/map-data/sprites/dialogue を TS モジュール分割し、Astro 側は薄いマウントだけにする。実施前にゲームの E2E スモーク(Playwright で start→warp→stamp→clear を `window.__GQ` 経由で叩く)を先に整備すること
- **実装可否**: **今は実装しない。提案を報告書に書くだけ**

### D10. 表示スタイルの細かい負債(まとめて低優先)

- **根拠**:
  - インライン `style="font-size: 0.45rem"` 等が Header/Footer/各ページに多数(ピクセルフォントのサイズ調整)
  - `tours/gion-sake-walk.astro:146,166` — 英語サイトなのに lightbox の aria-label が日本語(`拡大: ...`)
  - `BlogLayout.astro:232` 著者ボックス「since 2018」 vs `Footer.astro:16`「Based in Gion since 2024」の矛盾(コンテンツ判断)
- **改善案**: aria-label の英語化のみ実装可(`Enlarge: ...` / `Close` 等)。font-size のユーティリティクラス化は提案のみ。since 表記は Q4 で確認
- **実装可否**: aria-label 英語化のみ **実装可**(Phase 2)。他は提案/質問

### D11. sitemap の静的ルート手動管理

- **根拠**: `src/pages/sitemap.xml.ts:4-15` の `STATIC_ROUTES` 手動配列。ページ追加時に追記を忘れると sitemap から漏れる(現状は `/game` 含め同期できている)
- **改善案(提案のみ)**: `import.meta.glob` でページ一覧から導出する案があるが、`guest/`(noIndex 相当)の除外ルールなど仕様判断が絡む。**今回は触らず**、`STATIC_ROUTES` の上に「ページ追加時はここに追記」というコメントを1行足すだけに留める
- **実装可否**: コメント追加のみ実装可(Phase 2)

### D12. ブログ日付フィールドの三重定義(提案のみ)

- **根拠**: `src/content/config.ts:8-10` — `pubDate` / `last_updated` / `updatedAt` がすべて optional string。`src/utils/blog.ts:9-11` がこの順でフォールバック
- **問題**: 記事ごとにどれが入っているか不定で、ソート・sitemap lastmod の根拠が曖昧
- **改善案(提案のみ)**: 全 MDX の frontmatter 移行(30本超)が必要で、コンテンツ変更はスコープ外。報告書に統一案(`pubDate` 必須 + `updatedAt` optional、z.coerce.date 化)を書くだけにする
- **実装可否**: **実装しない**

---

## Implementation Phases

> 各フェーズの終わりに Verification Requirements を実行し、コミットしてから次へ進む。
> Q1/Q2 が未回答の間は Phase 3 以降の該当作業に入らず、Phase 1-2 だけ完了して報告する。

### Phase 0 — Baseline 記録

1. `git status` を記録。未コミットの untracked(`.claude/`、本ファイル)はそのまま放置
2. 作業ブランチ作成: `git checkout -b refactor/debt-cleanup`
3. `npm install` → `npm run build` 成功を確認、ページ数(53)を記録
4. `/tmp/baseline-pages.txt`・`/tmp/baseline-titles.txt` を保存(Baseline Commands 参照)

### Phase 1 — 安全網の構築(D7)

1. `@astrojs/check` と `typescript` を devDependencies に追加、`"check": "astro check"` を scripts に追加
2. `npm run check` を実行し、**既存エラー件数を記録(修正はしない)**
3. `.github/workflows/ci.yml` を追加: PR と main push で `npm ci && npm run build`(check はエラー0のときのみステップに含める)
4. コミット(このフェーズだけで1コミット)

### Phase 2 — 明らかに安全な整理(D4, D5, D8, D10一部, D11一部, ほか)

各項目を**個別コミット**で:

1. `.gitignore` に `.claude/` を追加
2. `sharp` を devDependencies に追加(D8)、`node scripts/optimize-images.mjs --dry-run` で動作確認
3. `src/config/site.ts` 新設: `SITE_NAME`(現状は暫定で `'OTAtrip Guide'`)、`CONTACT_EMAIL`、`BOKUN_CHANNEL_UUID`、`TRIPADVISOR_URL` を定義
4. D5: gmail 直書き9箇所を `CONTACT_EMAIL` 参照に置換(**出力値は不変**)
5. D4: Bokun UUID 4箇所を `BOKUN_CHANNEL_UUID` 参照に置換(**出力値は不変**)
6. D10: lightbox の日本語 aria-label を英語化
7. D11: sitemap の `STATIC_ROUTES` に保守コメント1行追加

### Phase 3 — タイトルバグ修正(D1)【Q2 回答待ち】

1. Q2 で確定したブランド表記を `SITE_NAME` に設定
2. `BaseLayout.astro` の `fullTitle` ロジックと `og:site_name` を `SITE_NAME` 参照に修正
3. Header/Footer/JSON-LD の表記も同一定数に揃える(視覚文言が変わる場合は報告に明記)
4. 検証: 全ページの `<title>` にブランドがちょうど1回。baseline-titles.txt との diff を報告に添付

### Phase 4 — 死コード削除(D2)【Q1 回答待ち】

1. `src/content/tours/` を削除、`config.ts` から tours コレクション定義を削除
2. `npm run build` でページ数不変を確認

### Phase 5 — ツアーデータ集約(D3)【Q1 回答待ち】

1. `src/data/tours.ts` を新設し、Q1 で確定した正値でツアー3件を定義
2. `index.astro` ティーザー → `tours/index.astro` カード → 各詳細ページのヒーロー統計、の順に**1ページずつ**参照へ切替(各ステップでビルド+目視)
3. 矛盾していた値(例: 3 hrs vs 90 min)が確定値に揃ったことを diff で示す

### Phase 6 — 共有コンポーネント抽出(D6)

1. `SectionHeading.astro` を抽出し3ツアーページへ適用 → ビルド+dist diff 確認 → コミット
2. `FaqList.astro` 同上
3. `TourTimeline.astro` 同上
4. 各ステップで dist の該当ページ diff を確認し、構造等価であることを報告

### Phase 7 — 提案のみ(実装しない)

D9(GionQuest 分割)、D12(日付フィールド統一)、D11本体(sitemap 自動化)、D10(font-size 体系化)について、報告書に「現状・提案・前提条件(必要な安全網)」を書く。**コードは書かない**

---

## Verification Requirements

各フェーズ後に必ず:

```sh
npm run build                                    # 成功すること
find dist -name "*.html" | sort | diff /tmp/baseline-pages.txt -   # ページ集合が不変(Phase 4 以降も不変のはず)
grep -roh "<title>[^<]*</title>" dist | sort | diff /tmp/baseline-titles.txt -  # Phase 3 までは不変、Phase 3 で意図差分のみ
```

加えてフェーズ固有:

- Phase 2(D4/D5): `grep -r "f23bdb2c" dist | wc -l` と `grep -ro "kyoto.otatrip.guide@gmail.com" dist | wc -l` が前後一致
- Phase 3: 二重ブランドの grep が 0 件
- Phase 5/6: `npx astro dev` で `/`、`/tours`、3ツアー詳細を目視(ヒーロー統計・FAQ 開閉・Bokun ウィジェット表示・lightbox 動作)
- ゲームに触れる変更をした場合(本計画では原則なし): `/game` で start → 移動 → NPC 会話 → スタンプ取得を手動確認。`window.__GQ.warp(507,88)` で巫女前へワープ可能

---

## Reporting Format

最終報告は以下の形式で:

```
## 実施サマリ
- 完了フェーズ: ...
- スキップ/ブロック: ...(理由と、回答待ちの質問番号)

## フェーズ別詳細
### Phase N
- 変更ファイル: ...
- 実行した検証コマンドと結果(コピペ): ...
- dist diff の要約: ...

## 既存エラーの記録
- astro check: X 件(未修正、内訳の要約)

## 提案(Phase 7)
- D9/D12/D11/D10 の提案本文

## 未解決の質問
- ...
```

---

## Out-of-scope Items(今回やらないこと)

- B2B/旅行会社向け機能(/partners ページ、TOUR FACTS、ポリシーページ等)— 別プロジェクトとして計画済み
- ブログ記事本文・frontmatter の変更、新規コンテンツ
- デザイン変更・テーマ刷新・フォント変更
- GionQuest の分割・機能追加(提案のみ)
- 画像の再最適化、`scripts/ga4/` の変更
- 依存パッケージのメジャーアップグレード
- メールアドレス・法人名の差し替え(値の確定待ち。D5 はその「受け皿」を作るだけ)
- `main` への直接デプロイ(PR を作って人間がマージする)

---

## 実装前に確認すべき質問(人間への質問)

**Q1. 祇園ツアーの正しい仕様はどれですか?**
ホーム(`index.astro`)は「3 hrs」、詳細ページは「90 min・4 daily slots(15:30/17:30/19:30/21:30)」、未使用の `content/tours/gion-sake-walk.md` は「3 hours・¥8,000・Max 8・集合: Gion-Shijo 駅 exit 6」と三者三様です。**正: 所要時間・価格・最大人数・開始時刻・集合場所**を確定してください。→ Phase 4・5 の前提

**Q2. ブランドの正式表記はどれですか?**
`OTAtrip Guide` / `OTA Trip Guide` が混在し、全ページの `<title>` に両方が二重表示されています。正式表記を1つ決めてください。→ Phase 3 の前提

**Q3. JSON-LD の `aggregateRating: reviewCount 200`(gion-sake-walk)は実際の TripAdvisor レビュー数と整合していますか?**
実数と乖離している場合、Google のリッチリザルトポリシー違反リスクがあります。修正要否の判断をください(今回の実装スコープには含めません。回答があれば数値のみ更新します)

**Q4. 創業年の表記は「since 2018」(ブログ著者ボックス)と「since 2024」(フッター)のどちらが正しいですか?**(文言修正は1行なので、回答があれば Phase 2 に含めます)

**Q5. フッターの SNS リンク(x.com/otatrip_guide・instagram.com/otatrip_guide)は実在アカウントですか?** リンク切れならフッターから外す判断が必要です(回答があれば Phase 2 に含めます)
