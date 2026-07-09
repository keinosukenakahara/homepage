const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, Header, Footer, PageNumber, PageBreak, LevelFormat,
  TableOfContents
} = require('docx');

const border = { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const BLUE = "1F4E79";
const LIGHT_BLUE = "BDD7EE";
const VERY_LIGHT = "EBF3FB";
const ORANGE = "C55A11";
const LIGHT_ORANGE = "FCE4D6";
const GREEN = "375623";
const LIGHT_GREEN = "E2EFDA";
const GRAY = "595959";
const LIGHT_GRAY = "F2F2F2";
const WHITE = "FFFFFF";

const PAGE = { width: 11906, height: 16838 };
const MARGIN = { top: 1134, right: 1134, bottom: 1134, left: 1134 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right; // 9638

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, font: "メイリオ", size: 28, bold: true, color: WHITE })],
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    indent: { left: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE } },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, font: "メイリオ", size: 24, bold: true, color: BLUE })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: LIGHT_BLUE } },
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 60 },
    children: [new TextRun({ text, font: "メイリオ", size: 22, bold: true, color: ORANGE })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "メイリオ", size: 20, ...opts })],
  });
}

function pb() {
  return new Paragraph({ children: [new PageBreak()] });
}

function blankLine() {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun("")] });
}

function cell(text, opts = {}) {
  const { fill = WHITE, bold = false, align = AlignmentType.LEFT, colSpan, width, color = "000000" } = opts;
  return new TableCell({
    borders,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    columnSpan: colSpan,
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 150, right: 150 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, font: "メイリオ", size: 18, bold, color })],
    })],
  });
}

function headerCell(text, opts = {}) {
  return cell(text, { fill: BLUE, bold: true, color: WHITE, ...opts });
}

function subHeaderCell(text, opts = {}) {
  return cell(text, { fill: LIGHT_BLUE, bold: true, color: BLUE, ...opts });
}

// ========== DOCUMENT ==========
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "メイリオ", size: 20 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "メイリオ", color: WHITE },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "メイリオ", color: BLUE },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "メイリオ", color: ORANGE },
        paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 2 }
      },
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "・",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 180 } } }
        }]
      },
      {
        reference: "bullets2",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "－",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 180 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 360 } } }
        }]
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE.width, height: PAGE.height },
        margin: MARGIN,
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE } },
          children: [
            new TextRun({ text: "宅配業務管理システム　要件定義・システム設計書", font: "メイリオ", size: 16, color: GRAY }),
            new TextRun({ text: "\t2026年7月", font: "メイリオ", size: 16, color: GRAY }),
          ],
          tabStops: [{ type: "right", position: 9638 }],
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: LIGHT_BLUE } },
          spacing: { before: 80 },
          children: [
            new TextRun({ text: "- ", font: "メイリオ", size: 16, color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], font: "メイリオ", size: 16, color: GRAY }),
            new TextRun({ text: " -", font: "メイリオ", size: 16, color: GRAY }),
          ],
        })]
      })
    },
    children: [
      // ==================== 表紙 ====================
      blankLine(), blankLine(), blankLine(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 120 },
        children: [new TextRun({ text: "宅配業務管理システム", font: "メイリオ", size: 56, bold: true, color: BLUE })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "要件定義・システム設計書", font: "メイリオ", size: 36, bold: false, color: GRAY })]
      }),
      new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE } }, children: [] }),
      blankLine(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "Ver. 1.0　2026年7月", font: "メイリオ", size: 22, color: GRAY })]
      }),
      blankLine(), blankLine(), blankLine(), blankLine(), blankLine(), blankLine(),

      // 基本情報テーブル
      new Table({
        width: { size: 6000, type: WidthType.DXA },
        columnWidths: [2000, 4000],
        rows: [
          new TableRow({ children: [headerCell("項目", { width: 2000 }), headerCell("内容", { width: 4000 })] }),
          new TableRow({ children: [subHeaderCell("対象局", { width: 2000 }), cell("広島中央郵便局（中区・東区）他", { width: 4000 })] }),
          new TableRow({ children: [subHeaderCell("対象スタッフ", { width: 2000 }), cell("65名（最大）", { width: 4000 })] }),
          new TableRow({ children: [subHeaderCell("作成日", { width: 2000 }), cell("2026年7月8日", { width: 4000 })] }),
          new TableRow({ children: [subHeaderCell("バージョン", { width: 2000 }), cell("1.0（初版）", { width: 4000 })] }),
        ]
      }),
      pb(),

      // ==================== 目次 ====================
      h1("目次"),
      blankLine(),
      ...["1. システム概要", "2. ユーザー・権限設計", "3. 機能①　発注書", "4. 機能②　支払通知書", "5. 機能③　前払い管理", "6. 通知設計（メール・LINE）", "7. データベース設計", "8. 技術スタック・インフラ", "9. フリーランス法対応", "10. 実装フェーズ計画"].map(t =>
        new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: t, font: "メイリオ", size: 20, color: BLUE })],
        })
      ),
      pb(),

      // ==================== 1. システム概要 ====================
      h1("1. システム概要"),
      blankLine(),
      p("本システムは、現在Excelで管理している宅配業務（配達件数管理・支払通知書・前払い）をWebアプリケーション化し、管理者・スタッフ双方の業務効率化とフリーランス法への対応を実現するものです。"),
      blankLine(),

      h2("1.1　現状の課題"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2000, 7638],
        rows: [
          new TableRow({ children: [headerCell("課題区分", { width: 2000 }), headerCell("内容", { width: 7638 })] }),
          new TableRow({ children: [subHeaderCell("Excel運用", { width: 2000 }), cell("7局・65名分のExcelを個別管理しており、更新・集計に多大な手間が発生", { width: 7638 })] }),
          new TableRow({ children: [subHeaderCell("発注書", { width: 2000 }), cell("稼働表（7ファイル）をもとに個別の発注書を手動作成している", { width: 7638 })] }),
          new TableRow({ children: [subHeaderCell("支払通知書", { width: 2000 }), cell("件数確認・承認・通知のフローがデジタル化されておらず、フリーランス法の明示義務への対応が不明確", { width: 7638 })] }),
          new TableRow({ children: [subHeaderCell("前払い", { width: 2000 }), cell("前払可能額の計算・依頼書作成がExcel手作業。前払済み額の管理も煩雑", { width: 7638 })] }),
        ]
      }),
      blankLine(),

      h2("1.2　解決する主要機能"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [400, 2400, 6838],
        rows: [
          new TableRow({ children: [headerCell("#", { width: 400 }), headerCell("機能", { width: 2400 }), headerCell("概要", { width: 6838 })] }),
          new TableRow({ children: [cell("①", { width: 400, align: AlignmentType.CENTER }), cell("発注書", { width: 2400, bold: true }), cell("稼働表から個別スタッフの発注書を自動生成・PDF出力", { width: 6838 })] }),
          new TableRow({ children: [cell("②", { width: 400, align: AlignmentType.CENTER }), cell("支払通知書", { width: 2400, bold: true }), cell("件数入力→仮確定→局NC突合→確定 の4ステップワークフロー。スタッフはマイページで閲覧", { width: 6838 })] }),
          new TableRow({ children: [cell("③", { width: 400, align: AlignmentType.CENTER }), cell("前払い管理", { width: 2400, bold: true }), cell("控除予定額・前払可能額をリアルタイム表示。前払依頼書を自動生成", { width: 6838 })] }),
        ]
      }),
      pb(),

      // ==================== 2. ユーザー・権限設計 ====================
      h1("2. ユーザー・権限設計"),
      blankLine(),

      h2("2.1　ロール定義"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2200, 3000, 4438],
        rows: [
          new TableRow({ children: [headerCell("ロール", { width: 2200 }), headerCell("対象者", { width: 3000 }), headerCell("主な権限", { width: 4438 })] }),
          new TableRow({ children: [
            cell("スーパー管理者", { width: 2200, bold: true }),
            cell("会社側（担当者）", { width: 3000 }),
            cell("全機能・全スタッフ・マスタ管理・局設定・確定操作", { width: 4438 })
          ]}),
          new TableRow({ children: [
            cell("管理者（局担当）", { width: 2200, bold: true }),
            cell("局ごとの担当者", { width: 3000 }),
            cell("担当局のスタッフ管理・件数入力・仮確定・修正", { width: 4438 })
          ]}),
          new TableRow({ children: [
            cell("スタッフ", { width: 2200, bold: true }),
            cell("業務委託スタッフ", { width: 3000 }),
            cell("自身の支払通知書閲覧・件数報告・前払い申請", { width: 4438 })
          ]}),
        ]
      }),
      blankLine(),

      h2("2.2　スタッフ情報マスタ（Excelから移行）"),
      p("現行Excelの「スタッフ情報」シートをデータベース化。以下の項目を登録・管理します。"),
      blankLine(),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [3000, 3200, 3438],
        rows: [
          new TableRow({ children: [headerCell("基本情報", { width: 3000 }), headerCell("報酬・単価", { width: 3200 }), headerCell("控除・口座", { width: 3438 })] }),
          new TableRow({ children: [
            cell("スタッフNo. / 氏名\n契約形態（個数委託・リーダー・最低保証）\n配送エリア / 適格請求書番号\nメールアドレス / LINEアカウント", { width: 3000 }),
            cell("通常支払率 / 合計支払率 / 繁忙期加算\n配達完了単価（税抜・税込）\n夜間配送単価 / 大配送単価 / 集荷単価\nエリア手当・通勤特別手当・付帯業務手当\n最低保証額", { width: 3200 }),
            cell("ガソリン代 / 車両費 / ETC\n任意保険控除 / 車両修理費\n車両貸出料 / 自動車税等 / 違約金\n振込先銀行・支店・科目・口座番号・名義\n郵便番号・住所", { width: 3438 })
          ]}),
        ]
      }),
      pb(),

      // ==================== 3. 機能① 発注書 ====================
      h1("3. 機能①　発注書"),
      blankLine(),

      h2("3.1　概要"),
      p("各局の稼働表（月次シフト）をシステムにインポートし、スタッフ別・局別に発注書を自動生成します。"),
      blankLine(),

      h2("3.2　稼働表のデータ形式（現行Excel）"),
      p("現行の稼働表は7局・月次Excelで管理されており、以下の共通フォーマットです。"),
      blankLine(),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2000, 7638],
        rows: [
          new TableRow({ children: [headerCell("項目", { width: 2000 }), headerCell("内容", { width: 7638 })] }),
          new TableRow({ children: [subHeaderCell("管理局", { width: 2000 }), cell("安佐南・宇品・西・中央（中区/東区）・伴・府中の7局", { width: 7638 })] }),
          new TableRow({ children: [subHeaderCell("構成", { width: 2000 }), cell("行：スタッフ名、列：日付（1日〜末日）、セル値：エリア記号or「休」", { width: 7638 })] }),
          new TableRow({ children: [subHeaderCell("エリア記号", { width: 2000 }), cell("A/B/C/D/E/F/G/H等（各局の配送ルート）、複合記号（AB/HB等）、特殊記号（減F/C霞等）", { width: 7638 })] }),
          new TableRow({ children: [subHeaderCell("兼務", { width: 2000 }), cell("同一スタッフが複数局に跨って稼働するケースあり（例：石丸慎治が府中局・宇品局両方に登録）", { width: 7638 })] }),
        ]
      }),
      blankLine(),

      h2("3.3　発注書生成フロー"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [600, 3000, 6038],
        rows: [
          new TableRow({ children: [headerCell("STEP", { width: 600 }), headerCell("操作", { width: 3000 }), headerCell("詳細", { width: 6038 })] }),
          new TableRow({ children: [cell("1", { width: 600, align: AlignmentType.CENTER }), cell("稼働表インポート", { width: 3000 }), cell("Excelファイルをアップロード→システムが自動解析（局名・年月・スタッフ・日付・エリアを抽出）", { width: 6038 })] }),
          new TableRow({ children: [cell("2", { width: 600, align: AlignmentType.CENTER }), cell("稼働確認", { width: 3000 }), cell("インポート結果をカレンダー表示。管理者が内容確認・修正（エリア変更・休日調整等）", { width: 6038 })] }),
          new TableRow({ children: [cell("3", { width: 600, align: AlignmentType.CENTER }), cell("発注書プレビュー", { width: 3000 }), cell("スタッフ別に発注書を自動生成。単価・エリア・稼働日数を自動反映", { width: 6038 })] }),
          new TableRow({ children: [cell("4", { width: 600, align: AlignmentType.CENTER }), cell("発行・送付", { width: 3000 }), cell("PDF出力 or システム内で発行。スタッフのマイページ・メール・LINEへ通知", { width: 6038 })] }),
        ]
      }),
      blankLine(),

      h2("3.4　発注書に記載する項目"),
      ...["委託業務内容（配送エリア・ルート記号）", "委託期間（稼働日・稼働日数）", "委託単価（通常配送・夜間・大配送・集荷の各単価）", "支払い条件（支払日・振込先）", "特記事項（最低保証・繁忙期加算の有無）"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: t, font: "メイリオ", size: 20 })] })
      ),
      pb(),

      // ==================== 4. 機能② 支払通知書 ====================
      h1("4. 機能②　支払通知書"),
      blankLine(),

      h2("4.1　全体フロー"),
      p("支払通知書は「件数入力→仮確定→局NC突合→確定」の4段階ワークフローで処理します。"),
      blankLine(),

      // フロー図（テーブルで表現）
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [1800, 400, 1800, 400, 1800, 400, 1800, 1238],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "① 件数入力", font: "メイリオ", size: 20, bold: true, color: BLUE })] })] }),
            new TableCell({ borders: noBorders, width: { size: 400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "→", font: "メイリオ", size: 24, bold: true, color: BLUE })] })] }),
            new TableCell({ borders: noBorders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: LIGHT_ORANGE, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "② 仮確定・通知", font: "メイリオ", size: 20, bold: true, color: ORANGE })] })] }),
            new TableCell({ borders: noBorders, width: { size: 400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "→", font: "メイリオ", size: 24, bold: true, color: BLUE })] })] }),
            new TableCell({ borders: noBorders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: LIGHT_ORANGE, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "③ 局NC突合・修正", font: "メイリオ", size: 20, bold: true, color: ORANGE })] })] }),
            new TableCell({ borders: noBorders, width: { size: 400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "→", font: "メイリオ", size: 24, bold: true, color: BLUE })] })] }),
            new TableCell({ borders: noBorders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "④ 確定・通知", font: "メイリオ", size: 20, bold: true, color: GREEN })] })] }),
            new TableCell({ borders: noBorders, width: { size: 1238, type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }),
          ]})
        ]
      }),
      blankLine(),

      h2("4.2　STEP①　件数入力（2パターン）"),
      h3("パターンA：スタッフが自己報告する場合"),
      ...["スタッフがマイページから稼働日ごとの配達件数を入力・送信", "入力項目：配達完了①②、転居大口等①②、夜間配送、大配送、集荷①②", "管理者に「スタッフから件数報告あり」の通知（メール/LINE）", "管理者が件数を確認し、「承認」または「差戻し」を実施", "差戻し時はスタッフへコメント付きで通知"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: t, font: "メイリオ", size: 20 })] })
      ),
      blankLine(),
      h3("パターンB：管理者が件数を入力する場合"),
      ...["管理者が管理画面でスタッフごと・日別に件数を直接入力", "入力後、仮確定操作へ進む（スタッフへの個別承認フローは省略可）"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: t, font: "メイリオ", size: 20 })] })
      ),
      blankLine(),

      h2("4.3　STEP②　仮確定・スタッフ通知"),
      p("管理者が「仮確定」ボタンを押すと以下が自動実行されます。"),
      ...["件数×単価で支払金額を自動計算（売上金額・各控除・振込金額）", "仮確定版の支払通知書が生成される", "スタッフのマイページに「仮確定の支払通知書」が表示される", "メールおよびLINEで「支払通知書（仮）が確認できます」と通知送信"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: t, font: "メイリオ", size: 20 })] })
      ),
      blankLine(),
      p("※ フリーランス法の明示義務についての注意事項", { bold: true, color: ORANGE }),
      new Paragraph({
        shading: { fill: LIGHT_ORANGE, type: ShadingType.CLEAR },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: ORANGE } },
        spacing: { before: 80, after: 80 },
        indent: { left: 200, right: 200 },
        children: [new TextRun({ text: "システム上での閲覧がフリーランス法（特定受託事業者に係る取引の適正化等に関する法律）第3条の「書面等の交付義務」を満たすかは法的確認が必要です。満たさない場合は、確定時にメール添付でPDFを送付する機能を実装します（後述の通知設計参照）。", font: "メイリオ", size: 20, color: ORANGE })]
      }),
      blankLine(),

      h2("4.4　STEP③　局NC突合・修正"),
      p("郵便局およびNCとの件数突合後、必要に応じて管理者が修正を入力します。"),
      blankLine(),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2500, 7138],
        rows: [
          new TableRow({ children: [headerCell("操作", { width: 2500 }), headerCell("システムの動作", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("件数の修正", { width: 2500 }), cell("管理者が修正後の件数を入力→金額を再計算", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("修正履歴の記録", { width: 2500 }), cell("仮確定時の件数・金額と修正後の差分を自動記録（変更ログ）", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("確定版への反映", { width: 2500 }), cell("修正があった場合、確定版支払通知書の備考欄に「〇月〇日修正：件数〇件→〇件（差額 ±〇円）」と自動記載", { width: 7138 })] }),
        ]
      }),
      blankLine(),

      h2("4.5　STEP④　確定・最終通知"),
      ...["管理者が「確定」ボタンを押すと確定版の支払通知書が生成される", "スタッフのマイページに確定版が表示（仮確定版は参照のみに変更）", "メール・LINEで「支払通知書が確定しました」と通知", "修正がある場合は確定版の備考欄に修正内容を明記", "PDF添付メール送信オプション（フリーランス法対応）"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: t, font: "メイリオ", size: 20 })] })
      ),
      blankLine(),

      h2("4.6　支払通知書の記載項目"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2500, 7138],
        rows: [
          new TableRow({ children: [headerCell("区分", { width: 2500 }), headerCell("項目", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("基本情報", { width: 2500 }), cell("支払日・対象月・スタッフ情報（氏名・住所・インボイス番号）", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("日次明細", { width: 2500 }), cell("稼働日ごとの件数内訳（配達完了・転居等・夜間・大配送・集荷）", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("売上計算", { width: 2500 }), cell("各件数×単価 / 手当合計 / 売上金額（税抜・税込・消費税額）", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("控除明細", { width: 2500 }), cell("ガソリン代・車両費・ETC・任意保険・車両修理・車両貸出料・違約金・前払返金・振込手数料", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("振込金額", { width: 2500 }), cell("引去金額合計 / 振込金額（売上-引去）", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("備考欄", { width: 2500 }), cell("修正履歴・特記事項（確定版のみ記載）", { width: 7138 })] }),
        ]
      }),
      pb(),

      // ==================== 5. 機能③ 前払い管理 ====================
      h1("5. 機能③　前払い管理"),
      blankLine(),

      h2("5.1　前払可能額の計算ロジック"),
      p("各スタッフの前払可能額は以下の計算式で算出します。"),
      blankLine(),
      new Paragraph({
        shading: { fill: VERY_LIGHT, type: ShadingType.CLEAR },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: BLUE } },
        spacing: { before: 80, after: 80 },
        indent: { left: 200, right: 200 },
        children: [
          new TextRun({ text: "前払可能額　＝　現時点の売上（件数×単価）　－　控除予定額　－　前払済み合計", font: "メイリオ", size: 22, bold: true, color: BLUE })
        ]
      }),
      blankLine(),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2500, 7138],
        rows: [
          new TableRow({ children: [headerCell("変数", { width: 2500 }), headerCell("内容", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("現時点の売上", { width: 2500 }), cell("システムに入力済みの件数×各単価で自動計算。日次でリアルタイム更新", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("控除予定額", { width: 2500 }), cell("ガソリン代・車両費・ETC・任意保険控除等。管理者が月初に登録（変更可）", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("前払済み合計", { width: 2500 }), cell("入金日ベースで記録した前払金額の累積（複数回対応）", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("マイナス前払い", { width: 2500 }), cell("前払可能額がマイナスでも前払い申請・承認が可能（管理者判断で許可）", { width: 7138 })] }),
        ]
      }),
      blankLine(),

      h2("5.2　計算例"),
      new Paragraph({
        shading: { fill: LIGHT_GRAY, type: ShadingType.CLEAR },
        spacing: { before: 80, after: 80 },
        indent: { left: 200, right: 200 },
        children: [
          new TextRun({ text: "例）スタッフAの前払可能額計算", font: "メイリオ", size: 20, bold: true }),
        ]
      }),
      new Table({
        width: { size: 5000, type: WidthType.DXA },
        columnWidths: [2500, 2500],
        rows: [
          new TableRow({ children: [subHeaderCell("現時点の売上", { width: 2500 }), cell("150,000 円", { width: 2500, align: AlignmentType.RIGHT })] }),
          new TableRow({ children: [cell("控除予定：ガソリン代", { width: 2500 }), cell("－ 50,000 円", { width: 2500, align: AlignmentType.RIGHT, color: "CC0000" })] }),
          new TableRow({ children: [cell("控除予定：車両費", { width: 2500 }), cell("－ 25,000 円", { width: 2500, align: AlignmentType.RIGHT, color: "CC0000" })] }),
          new TableRow({ children: [cell("前払済み", { width: 2500 }), cell("－ 20,000 円", { width: 2500, align: AlignmentType.RIGHT, color: "CC0000" })] }),
          new TableRow({ children: [subHeaderCell("前払可能額", { width: 2500 }), new TableCell({ borders, width: { size: 2500, type: WidthType.DXA }, shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "= 55,000 円", font: "メイリオ", size: 20, bold: true, color: BLUE })] })] })] }),
        ]
      }),
      blankLine(),

      h2("5.3　前払い申請フロー"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [600, 3000, 6038],
        rows: [
          new TableRow({ children: [headerCell("STEP", { width: 600 }), headerCell("操作", { width: 3000 }), headerCell("詳細", { width: 6038 })] }),
          new TableRow({ children: [cell("1", { width: 600, align: AlignmentType.CENTER }), cell("控除予定額の登録", { width: 3000 }), cell("管理者が月初に各スタッフの控除予定額（ガソリン・車両費等）を入力", { width: 6038 })] }),
          new TableRow({ children: [cell("2", { width: 600, align: AlignmentType.CENTER }), cell("前払可能額確認", { width: 3000 }), cell("管理者・スタッフ双方がマイページで現時点の前払可能額をリアルタイム確認", { width: 6038 })] }),
          new TableRow({ children: [cell("3", { width: 600, align: AlignmentType.CENTER }), cell("前払金額入力", { width: 3000 }), cell("管理者が入金日ベースで前払金額を入力（複数回可。マイナスでも承認可能）", { width: 6038 })] }),
          new TableRow({ children: [cell("4", { width: 600, align: AlignmentType.CENTER }), cell("前払依頼書生成", { width: 3000 }), cell("入力内容から前払依頼書をPDFで自動生成（スタッフ名・金額・入金日・振込先記載）", { width: 6038 })] }),
          new TableRow({ children: [cell("5", { width: 600, align: AlignmentType.CENTER }), cell("承認・送付", { width: 3000 }), cell("管理者承認後、スタッフへメール・LINEで通知。前払済み額に加算される", { width: 6038 })] }),
        ]
      }),
      blankLine(),

      h2("5.4　前払い管理画面の表示項目"),
      ...["スタッフ一覧：氏名・現時点売上・控除予定額合計・前払済合計・前払可能額（リアルタイム）", "前払可能額がマイナスの場合は赤字表示（警告だが承認は可能）", "入金日別の前払金額履歴一覧（入金日・金額・承認者・ステータス）", "月末の支払通知書確定時に前払返金として自動反映"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: t, font: "メイリオ", size: 20 })] })
      ),
      blankLine(),

      h2("5.5　前払依頼書のフォーマット（現行Excelから確認）"),
      p("実際の前払依頼書（安部宏文氏のサンプル：2018年8月〜2026年6月まで89件分）を確認した結果、以下の項目で構成されていることを確認しました。1回の前払いにつき1枚の依頼書を発行する運用です。"),
      blankLine(),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2800, 3200, 3638],
        rows: [
          new TableRow({ children: [headerCell("項目", { width: 2800 }), headerCell("現行の記載例", { width: 3200 }), headerCell("システムでの自動入力", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("所属", { width: 2800 }), cell("西郵便局 / 軽1課4係", { width: 3200 }), cell("スタッフマスタの担当局・係から自動取得", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("インボイス番号", { width: 2800 }), cell("T4810582005751（登録済の場合）", { width: 3200 }), cell("スタッフマスタから自動取得", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("スタッフ名", { width: 2800 }), cell("安部　宏文", { width: 3200 }), cell("スタッフマスタから自動取得", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("振込金額", { width: 2800 }), cell("264,204円（月ごとに異なる）", { width: 3200 }), cell("管理者が入力した前払金額を自動反映", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("振込口座", { width: 2800 }), cell("広島銀行 本川支店 普通 0850870", { width: 3200 }), cell("スタッフマスタの口座情報から自動取得", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("口座名義", { width: 2800 }), cell("アベ　ヒロフミ", { width: 3200 }), cell("スタッフマスタから自動取得", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("備考", { width: 2800 }), cell("「○月分全額」など任意テキスト", { width: 3200 }), cell("管理者が入力。デフォルト：「○月分前払い」", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("入金希望日", { width: 2800 }), cell("入金予定日（週次の入金日から選択）", { width: 3200 }), cell("管理者が入金日プルダウンから選択", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("確認者", { width: 2800 }), cell("管理者名（荒川・澄川等）", { width: 3200 }), cell("ログイン中の管理者名を自動入力", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("入金者", { width: 2800 }), cell("入金担当者名（後藤等）", { width: 3200 }), cell("承認時に入力欄を設ける", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("入金日", { width: 2800 }), cell("実際の入金完了日（後で記入）", { width: 3200 }), cell("入金完了後に更新。空欄から記入可能", { width: 3638 })] }),
        ]
      }),
      blankLine(),
      new Paragraph({
        shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: BLUE } },
        spacing: { before: 80, after: 80 },
        indent: { left: 200, right: 200 },
        children: [new TextRun({ text: "【運用ポイント】現行は1シート＝1回の前払いとして管理。複数回申請の場合は複数PDFを生成。シート名は発行日ベース（例：2026.6.24＝6月24日に5月分を前払い）。システムでもこの1申請1PDF方式を踏襲します。", font: "メイリオ", size: 20, color: BLUE })]
      }),
      pb(),

      // ==================== 6. 通知設計 ====================
      h1("6. 通知設計（メール・LINE）"),
      blankLine(),

      h2("6.1　通知一覧"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [3200, 1500, 1500, 3438],
        rows: [
          new TableRow({ children: [headerCell("通知タイミング", { width: 3200 }), headerCell("メール", { width: 1500 }), headerCell("LINE", { width: 1500 }), headerCell("宛先・内容", { width: 3438 })] }),
          new TableRow({ children: [cell("スタッフが件数報告を送信", { width: 3200 }), cell("○", { width: 1500, align: AlignmentType.CENTER }), cell("○", { width: 1500, align: AlignmentType.CENTER }), cell("管理者へ「件数報告受信」通知", { width: 3438 })] }),
          new TableRow({ children: [cell("管理者が差戻し", { width: 3200 }), cell("○", { width: 1500, align: AlignmentType.CENTER }), cell("○", { width: 1500, align: AlignmentType.CENTER }), cell("スタッフへ差戻しコメント付き通知", { width: 3438 })] }),
          new TableRow({ children: [cell("支払通知書　仮確定", { width: 3200 }), cell("○（PDF添付可）", { width: 1500, align: AlignmentType.CENTER }), cell("○", { width: 1500, align: AlignmentType.CENTER }), cell("スタッフへ「仮確定の支払通知書を確認してください」", { width: 3438 })] }),
          new TableRow({ children: [cell("支払通知書　確定", { width: 3200 }), cell("○（PDF添付）", { width: 1500, align: AlignmentType.CENTER }), cell("○", { width: 1500, align: AlignmentType.CENTER }), cell("スタッフへ「支払通知書が確定しました」＋PDF添付", { width: 3438 })] }),
          new TableRow({ children: [cell("発注書発行", { width: 3200 }), cell("○（PDF添付）", { width: 1500, align: AlignmentType.CENTER }), cell("○", { width: 1500, align: AlignmentType.CENTER }), cell("スタッフへ翌月の発注書をPDF添付で送付", { width: 3438 })] }),
          new TableRow({ children: [cell("前払い承認", { width: 3200 }), cell("○", { width: 1500, align: AlignmentType.CENTER }), cell("○", { width: 1500, align: AlignmentType.CENTER }), cell("スタッフへ「前払い申請が承認されました（金額・入金日）」", { width: 3438 })] }),
        ]
      }),
      blankLine(),

      h2("6.2　LINE連携"),
      p("LINE公式アカウントまたはLINE Messaging APIを使用。以下2案から選択します。"),
      blankLine(),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2000, 4000, 3638],
        rows: [
          new TableRow({ children: [headerCell("案", { width: 2000 }), headerCell("方式", { width: 4000 }), headerCell("特徴", { width: 3638 })] }),
          new TableRow({ children: [cell("A案", { width: 2000, bold: true }), cell("LINE Messaging API（LINE公式アカウント）", { width: 4000 }), cell("スタッフはLINEで公式アカウントを友だち追加→双方向通知。月額費用あり", { width: 3638 })] }),
          new TableRow({ children: [cell("B案", { width: 2000, bold: true }), cell("LINE WORKS", { width: 4000 }), cell("社内向けビジネスチャット。すでにLINE WORKSを使用している場合は追加費用なし", { width: 3638 })] }),
        ]
      }),
      pb(),

      // ==================== 7. データベース設計 ====================
      h1("7. データベース設計"),
      blankLine(),

      h2("7.1　主要テーブル一覧"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2800, 6838],
        rows: [
          new TableRow({ children: [headerCell("テーブル名", { width: 2800 }), headerCell("内容", { width: 6838 })] }),
          new TableRow({ children: [cell("users（ユーザー）", { width: 2800, bold: true }), cell("スタッフ・管理者のアカウント情報（ID・メール・パスワードハッシュ・ロール）", { width: 6838 })] }),
          new TableRow({ children: [cell("staff_masters（スタッフマスタ）", { width: 2800, bold: true }), cell("氏名・契約形態・各単価・控除項目・口座情報・インボイス番号", { width: 6838 })] }),
          new TableRow({ children: [cell("offices（郵便局マスタ）", { width: 2800, bold: true }), cell("局名・住所・担当管理者ID", { width: 6838 })] }),
          new TableRow({ children: [cell("shift_schedules（稼働表）", { width: 2800, bold: true }), cell("staff_id・office_id・日付・エリア記号・稼働フラグ（インポート元ファイル名保持）", { width: 6838 })] }),
          new TableRow({ children: [cell("orders（発注書）", { width: 2800, bold: true }), cell("発注書No.・staff_id・対象月・生成日時・ステータス・PDFパス", { width: 6838 })] }),
          new TableRow({ children: [cell("delivery_counts（件数明細）", { width: 2800, bold: true }), cell("staff_id・日付・配達完了①②・転居大口等①②・夜間・大配送・集荷①②・入力者・報告区分（スタッフ報告/管理者入力）", { width: 6838 })] }),
          new TableRow({ children: [cell("payment_notices（支払通知書）", { width: 2800, bold: true }), cell("通知書No.・staff_id・対象月・ステータス（仮確定/確定）・売上金額・各控除・振込金額・PDF（仮/確定）", { width: 6838 })] }),
          new TableRow({ children: [cell("payment_notice_revisions（修正履歴）", { width: 2800, bold: true }), cell("payment_notice_id・修正日時・修正前件数・修正後件数・差額・修正者・修正理由", { width: 6838 })] }),
          new TableRow({ children: [cell("deduction_plans（控除予定額）", { width: 2800, bold: true }), cell("staff_id・対象月・控除種別（ガソリン/車両費/ETC等）・金額", { width: 6838 })] }),
          new TableRow({ children: [cell("advance_payments（前払い）", { width: 2800, bold: true }), cell("staff_id・申請日・入金予定日・金額・ステータス（申請中/承認済/却下）・承認者・前払依頼書PDFパス", { width: 6838 })] }),
          new TableRow({ children: [cell("notifications（通知ログ）", { width: 2800, bold: true }), cell("宛先staff_id・通知種別・送信日時・送信手段（メール/LINE）・成否", { width: 6838 })] }),
        ]
      }),
      blankLine(),

      h2("7.2　ステータス遷移"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2500, 7138],
        rows: [
          new TableRow({ children: [headerCell("対象", { width: 2500 }), headerCell("ステータス遷移", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("件数明細", { width: 2500 }), cell("下書き → 報告済み（スタッフ送信）→ 承認 / 差戻し → 仮確定反映", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("支払通知書", { width: 2500 }), cell("未作成 → 仮確定 → 突合中 → 確定（取消し機能は管理者のみ可）", { width: 7138 })] }),
          new TableRow({ children: [subHeaderCell("前払い申請", { width: 2500 }), cell("下書き → 申請中 → 承認済み / 却下 → 支払通知書に前払返金として反映", { width: 7138 })] }),
        ]
      }),
      pb(),

      // ==================== 8. 技術スタック ====================
      h1("8. 技術スタック・インフラ"),
      blankLine(),

      h2("8.1　推奨技術スタック"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [2000, 3500, 4138],
        rows: [
          new TableRow({ children: [headerCell("レイヤー", { width: 2000 }), headerCell("技術", { width: 3500 }), headerCell("選定理由", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("フロントエンド", { width: 2000 }), cell("Next.js（React）+ Tailwind CSS", { width: 3500 }), cell("管理画面・スタッフポータルを1プロジェクトで構築。SPAで快適なUX", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("バックエンド", { width: 2000 }), cell("Next.js API Routes / Node.js", { width: 3500 }), cell("フロントと同一フレームワークで工数削減", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("データベース", { width: 2000 }), cell("PostgreSQL（Supabase）", { width: 3500 }), cell("RLS（Row Level Security）でスタッフが自身のデータのみ閲覧可能。無料枠あり", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("認証", { width: 2000 }), cell("Supabase Auth / NextAuth.js", { width: 3500 }), cell("メール+パスワード認証。ロールベースアクセス制御", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("PDF生成", { width: 2000 }), cell("@react-pdf/renderer または Puppeteer", { width: 3500 }), cell("支払通知書・発注書・前払依頼書をPDF自動生成", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("メール送信", { width: 2000 }), cell("Resend / SendGrid", { width: 3500 }), cell("PDF添付メール送信対応。送信ログ管理", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("LINE通知", { width: 2000 }), cell("LINE Messaging API", { width: 3500 }), cell("プッシュ通知でスタッフへ即時連絡", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("Excelインポート", { width: 2000 }), cell("SheetJS（xlsx）", { width: 3500 }), cell("稼働表Excelファイルを解析してスケジュールDB登録", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("ホスティング", { width: 2000 }), cell("Vercel（Next.js最適化）", { width: 3500 }), cell("デプロイが容易。無料枠あり。日本リージョン対応", { width: 4138 })] }),
          new TableRow({ children: [subHeaderCell("ファイルストレージ", { width: 2000 }), cell("Supabase Storage", { width: 3500 }), cell("生成したPDFファイルの保管。アクセス権限管理", { width: 4138 })] }),
        ]
      }),
      blankLine(),

      h2("8.2　セキュリティ要件"),
      ...["HTTPS必須（Vercelは標準でSSL対応）", "パスワードはbcryptでハッシュ化", "スタッフは自分のデータのみアクセス可（Row Level Security）", "PDFファイルは署名付きURL（有効期限付き）でのみダウンロード可", "操作ログの記録（誰がいつ何を操作したか）"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: t, font: "メイリオ", size: 20 })] })
      ),
      pb(),

      // ==================== 9. フリーランス法対応 ====================
      h1("9. フリーランス法対応"),
      blankLine(),

      p("2024年11月施行の「特定受託事業者に係る取引の適正化等に関する法律（フリーランス保護法）」第3条に基づき、業務委託時に書面等での明示義務があります。"),
      blankLine(),

      h2("9.1　明示が必要な事項"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [500, 3500, 5638],
        rows: [
          new TableRow({ children: [headerCell("#", { width: 500 }), headerCell("明示事項", { width: 3500 }), headerCell("本システムでの対応", { width: 5638 })] }),
          new TableRow({ children: [cell("1", { width: 500, align: AlignmentType.CENTER }), cell("業務内容", { width: 3500 }), cell("発注書（配送エリア・業務種別）で対応", { width: 5638 })] }),
          new TableRow({ children: [cell("2", { width: 500, align: AlignmentType.CENTER }), cell("業務委託代金（報酬金額）", { width: 3500 }), cell("支払通知書（確定版）でPDF送付", { width: 5638 })] }),
          new TableRow({ children: [cell("3", { width: 500, align: AlignmentType.CENTER }), cell("支払期日", { width: 3500 }), cell("支払通知書に支払日を明記", { width: 5638 })] }),
          new TableRow({ children: [cell("4", { width: 500, align: AlignmentType.CENTER }), cell("業務委託をする事業者の氏名等", { width: 3500 }), cell("発注書ヘッダーに発注者情報を記載", { width: 5638 })] }),
        ]
      }),
      blankLine(),

      h2("9.2　書面交付の方法"),
      new Paragraph({
        shading: { fill: LIGHT_ORANGE, type: ShadingType.CLEAR },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: ORANGE } },
        spacing: { before: 80, after: 80 },
        indent: { left: 200, right: 200 },
        children: [new TextRun({ text: "【重要】フリーランス法では「書面」または「電磁的方法」での交付が必要です。システム上の閲覧で要件を満たすか法的解釈が分かれるため、確定版の支払通知書と発注書は必ずPDFをメール添付で送付することを推奨します。弁護士・社会保険労務士への確認を強く推奨します。", font: "メイリオ", size: 20, color: ORANGE })]
      }),
      blankLine(),
      p("本システムでは以下の対応を実装します。"),
      ...["支払通知書確定時：PDF生成＋メール添付送信（自動）", "発注書発行時：PDF生成＋メール添付送信（自動）", "システム内での閲覧（スタッフポータル）は付加価値として提供", "送信ログを保存し、交付記録として証跡管理"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: t, font: "メイリオ", size: 20 })] })
      ),
      pb(),

      // ==================== 10. 実装フェーズ ====================
      h1("10. 実装フェーズ計画"),
      blankLine(),

      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [1200, 2000, 4000, 2438],
        rows: [
          new TableRow({ children: [headerCell("フェーズ", { width: 1200 }), headerCell("期間目安", { width: 2000 }), headerCell("実装内容", { width: 4000 }), headerCell("優先度", { width: 2438 })] }),
          new TableRow({ children: [
            cell("Phase 1", { width: 1200, bold: true }),
            cell("2〜3ヶ月", { width: 2000 }),
            cell("・スタッフマスタ・認証基盤\n・件数入力（管理者）\n・支払通知書（仮確定・確定）\n・スタッフポータル（通知書閲覧）\n・PDF生成・メール送信", { width: 4000 }),
            new TableCell({ borders, width: { size: 2438, type: WidthType.DXA }, shading: { fill: LIGHT_ORANGE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "★★★ 最高", font: "メイリオ", size: 18, bold: true, color: ORANGE })] })] })
          ]}),
          new TableRow({ children: [
            cell("Phase 2", { width: 1200, bold: true }),
            cell("1〜2ヶ月", { width: 2000 }),
            cell("・稼働表インポート機能\n・発注書自動生成\n・スタッフからの件数報告フロー\n・LINE通知連携", { width: 4000 }),
            new TableCell({ borders, width: { size: 2438, type: WidthType.DXA }, shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "★★☆ 高", font: "メイリオ", size: 18, bold: true, color: BLUE })] })] })
          ]}),
          new TableRow({ children: [
            cell("Phase 3", { width: 1200, bold: true }),
            cell("1〜2ヶ月", { width: 2000 }),
            cell("・前払い管理・前払依頼書PDF生成\n・修正履歴管理・備考欄自動記載\n・損益集計レポート", { width: 4000 }),
            new TableCell({ borders, width: { size: 2438, type: WidthType.DXA }, shading: { fill: LIGHT_GRAY, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "★☆☆ 中", font: "メイリオ", size: 18, bold: true, color: GRAY })] })] })
          ]}),
        ]
      }),
      blankLine(), blankLine(),

      h2("10.2　Excelからのデータ移行"),
      ...["スタッフマスタ：Excelの「スタッフ情報」シートからCSVエクスポート→DB一括インポート", "稼働表：既存7ファイル（安佐南・宇品・西・中央中区/東区・伴・府中）のインポート機能で取込み", "控除予定額・前払い履歴：「一般管理費・請求」シートのデータを初期登録（入金日ベースの前払履歴89件も取込み可）", "支払通知書の過去データ：必要に応じてPDF化して添付保存"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: t, font: "メイリオ", size: 20 })] })
      ),
      blankLine(),

      h2("10.3　概算費用"),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [3000, 3000, 3638],
        rows: [
          new TableRow({ children: [headerCell("項目", { width: 3000 }), headerCell("月額概算", { width: 3000 }), headerCell("備考", { width: 3638 })] }),
          new TableRow({ children: [cell("Vercel（ホスティング）", { width: 3000 }), cell("無料〜$20/月", { width: 3000 }), cell("Pro plan推奨（帯域・ビルド時間拡張）", { width: 3638 })] }),
          new TableRow({ children: [cell("Supabase（DB・認証・ストレージ）", { width: 3000 }), cell("無料〜$25/月", { width: 3000 }), cell("Free planで65名規模は概ね対応可", { width: 3638 })] }),
          new TableRow({ children: [cell("メール送信（Resend等）", { width: 3000 }), cell("無料〜$20/月", { width: 3000 }), cell("月3,000通以内なら無料枠あり", { width: 3638 })] }),
          new TableRow({ children: [cell("LINE Messaging API", { width: 3000 }), cell("無料〜従量課金", { width: 3000 }), cell("月1,000通まで無料。超過分は都度課金", { width: 3638 })] }),
          new TableRow({ children: [subHeaderCell("月額合計（概算）", { width: 3000 }), subHeaderCell("0〜7,000円/月", { width: 3000 }), cell("スケールに応じて$45〜$65/月程度", { width: 3638 })] }),
        ]
      }),
      blankLine(),
      p("※ 開発費は別途（社内開発・外注・ノーコード等の選択肢によって大きく異なります）", { color: GRAY }),
      blankLine(), blankLine(),
      new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE } }, spacing: { before: 240 }, children: [new TextRun({ text: "以上", font: "メイリオ", size: 20, bold: true })] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/sessions/busy-kind-clarke/mnt/outputs/宅配業務管理システム_システム設計書.docx', buffer);
  console.log('完了');
});
