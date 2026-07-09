// ============================================================
// スタッフ個別条件・支払設定（法人別管理・前払い機能付き）
// ============================================================

// --- 法人定義 ---
const CORP_DEFS = [
  { id: 'band',    label: '合同会社band',         keyword: 'band',     color: '#1e40af', bg: '#eff6ff' },
  { id: 'soei',   label: '創栄サポート株式会社',  keyword: '創栄サポート', color: '#047857', bg: '#f0fdf4' },
  { id: 'charm',  label: '株式会社Charment',      keyword: 'Charment', color: '#9333ea', bg: '#faf5ff' },
  { id: 'rapid',  label: '合同会社Rapid Line',    keyword: 'Rapid Line', color: '#c2410c', bg: '#fff7ed' },
  { id: 'koko',   label: 'こころ',                keyword: 'こころ',   color: '#0e7490', bg: '#ecfeff' },
  { id: 'other',  label: 'その他（大福丸等）',     keyword: null,       color: '#374151', bg: '#f9fafb' },
];

function getCorpForStaff(name) {
  for (const c of CORP_DEFS) {
    if (c.keyword && name.includes(c.keyword)) return c;
  }
  return null; // 個人委託
}

function corpLabel(name) {
  const c = getCorpForStaff(name);
  return c ? `<span style="background:${c.bg};color:${c.color};border-radius:4px;padding:1px 7px;font-size:11px;font-weight:600;">${c.label}</span>` : '';
}

// --- 標準控除カテゴリ ---
const DEDUCT_CATS = [
  { id: 'gasoline',   label: 'ガソリン代' },
  { id: 'vehicle',    label: '車両貸出費用' },
  { id: 'prepaid',    label: '前払い済み委託費' },
  { id: 'directpay',  label: '滞納分直納' },
  { id: 'insurance',  label: '任意保険' },
  { id: 'penalty',    label: '違約金' },
];

// --- 前払いデータストア ---
// staffPreData[name] = { counts:{}, deductPlan:{gasoline:0,...}, customDeducts:[{label,amt}], prepayEntries:[{date,amt}] }
const staffPreData = {};

function getPreData(name) {
  if (!staffPreData[name]) {
    staffPreData[name] = {
      counts: { '配達完了①': 0, '配達完了②': 0, '転居大口等①': 0, '夜間配送': 0, '大配送': 0, '集荷①': 0, '集荷②': 0, '尋ねあたらず': 0, 'その他事故': 0 },
      deductPlan: {},
      customDeducts: [],
      prepayEntries: []
    };
    // 初期値：車両貸出費用をマスタから自動設定
    const sc = getStaffCond(name);
    if (sc.rentalFee) staffPreData[name].deductPlan.vehicle = sc.rentalFee;
  }
  return staffPreData[name];
}

function calcPrePay(name) {
  const pd = getPreData(name);
  const sc = getStaffCond(name);
  let gross = 0;
  if (sc.fixedFee) {
    gross = sc.fixedFee;
  } else {
    const up = sc.unitPrice || 0;
    const stdP = { '夜間配送': 31, '大配送': 72, '集荷①': 80, '集荷②': 80 };
    const mainItems = ['配達完了①','配達完了②','転居大口等①','転居大口等②','尋ねあたらず','その他事故'];
    for (const [item, qty] of Object.entries(pd.counts || {})) {
      if (!qty) continue;
      const p = mainItems.includes(item) ? up : (stdP[item] || 0);
      gross += qty * p;
    }
  }
  let totalDeduct = 0;
  for (const c of DEDUCT_CATS) totalDeduct += Number(pd.deductPlan[c.id] || 0);
  for (const c of (pd.customDeducts || [])) totalDeduct += Number(c.amt || 0);
  const alreadyPrepaid = (pd.prepayEntries || []).reduce((s, e) => s + Number(e.amt || 0), 0);
  const available = gross - totalDeduct;
  const remaining = available - alreadyPrepaid;
  return { gross, totalDeduct, alreadyPrepaid, available, remaining };
}

// --- 状態変数 ---
let scTab = 'individual'; // 'individual' | 'corporate'
let scFilterBase2 = '';
let scFilterRole2 = '';

function getStaffCond(name) {
  const ov = staffCondOverrides[name];
  const base = STAFF_CONDITIONS.find(s => s.name === name) || {};
  return ov ? Object.assign({}, base, ov) : base;
}

function staffPayCalc(sc, counts) {
  if (!counts) counts = { '配達完了①': 100, '配達完了②': 0, '転居大口等①': 5, '転居大口等②': 0, '夜間配送': 3, '大配送': 2, '集荷①': 4, '集荷②': 0, '尋ねあたらず': 2, 'その他事故': 1 };
  if (sc.fixedFee) {
    const gross = sc.fixedFee;
    const deduct = sc.rentalFee || 0;
    return { gross, deduct, net: gross - deduct, type: 'fixed' };
  }
  const up = sc.unitPrice || 0;
  const stdPrices = { '夜間配送': 31, '大配送': 72, '集荷①': 80, '集荷②': 80 };
  let gross = 0;
  for (const [item, qty] of Object.entries(counts)) {
    if (!qty) continue;
    const p = ['配達完了①','配達完了②','転居大口等①','転居大口等②','尋ねあたらず','その他事故'].includes(item) ? up : (stdPrices[item] || 0);
    gross += qty * p;
  }
  const deduct = sc.rentalFee || 0;
  return { gross, deduct, net: gross - deduct, type: 'unit' };
}

// ============================================================
// メインページ
// ============================================================
function pageStaffConditions() {
  return scTab === 'corporate' ? renderCorporateTab() : renderIndividualTab();
}

function tabBar() {
  const tabs = [
    { id: 'individual', label: '👤 個人別一覧' },
    { id: 'corporate',  label: '🏢 法人別管理' },
  ];
  return `<div style="display:flex;gap:4px;margin-bottom:18px;border-bottom:2px solid #e2e8f0;padding-bottom:0;">
    ${tabs.map(t => `<button onclick="scTab='${t.id}';render();"
      style="padding:9px 18px;border:none;cursor:pointer;font-size:14px;font-weight:600;border-radius:8px 8px 0 0;margin-bottom:-2px;
      background:${scTab===t.id?'#fff':'transparent'};color:${scTab===t.id?'#1e40af':'#64748b'};
      border-bottom:${scTab===t.id?'2px solid #1e40af':'2px solid transparent'};">${t.label}</button>`).join('')}
  </div>`;
}

// ============================================================
// 個人別タブ
// ============================================================
function renderIndividualTab() {
  const bases = [...new Set(STAFF_CONDITIONS.map(s => s.base))].sort();
  const roles = [...new Set(STAFF_CONDITIONS.map(s => s.role))].sort();
  const filtered = STAFF_CONDITIONS.filter(s => {
    if (scFilterBase2 && s.base !== scFilterBase2) return false;
    if (scFilterRole2 && s.role !== scFilterRole2) return false;
    return true;
  });

  const unitCount = filtered.filter(s => !s.fixedFee && s.unitPrice).length;
  const fixedCount = filtered.filter(s => s.fixedFee).length;
  const rentalCount = filtered.filter(s => s.rentalFee > 0).length;

  const rows = filtered.map(s => {
    const sc = getStaffCond(s.name);
    const corp = getCorpForStaff(s.name);
    const hasOv = !!staffCondOverrides[s.name];
    return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 10px;">
        <div style="font-weight:600;font-size:13px;">${s.name.replace(/[（(][^）)]+[）)]/g,'').trim()}${hasOv?'<span style="background:#fef9c3;color:#713f12;font-size:10px;border-radius:3px;padding:1px 5px;margin-left:4px;">編集済</span>':''}</div>
        <div style="margin-top:2px;">${corp ? `<span style="background:${corp.bg};color:${corp.color};border-radius:3px;padding:1px 6px;font-size:10px;">${corp.label}</span>` : `<span style="color:#94a3b8;font-size:10px;">${sc.contract}</span>`}</div>
      </td>
      <td style="padding:8px 10px;font-size:13px;">${(sc.base||'').replace('郵便局','')}</td>
      <td style="padding:8px 10px;"><span style="background:${sc.role==='リーダー'?'#fef3c7':'#eff6ff'};color:${sc.role==='リーダー'?'#92400e':'#1e40af'};border-radius:4px;padding:2px 7px;font-size:12px;">${sc.role||''}</span></td>
      <td style="padding:8px 10px;text-align:right;font-size:13px;">${sc.fixedFee?`<span style="color:#7c3aed;font-weight:700;">固定 ¥${(sc.fixedFee).toLocaleString()}/月</span>`:`<span style="font-weight:700;">¥${(sc.unitPrice||0).toLocaleString()}</span><span style="color:#64748b;font-size:11px;">/件</span>`}</td>
      <td style="padding:8px 10px;text-align:right;font-size:13px;">${sc.rentalFee>0?`<span style="color:#dc2626;">−¥${sc.rentalFee.toLocaleString()}</span>`:`<span style="color:#94a3b8;">−</span>`}</td>
      <td style="padding:8px 10px;text-align:center;"><span style="background:${sc.vehicle==='持込'?'#f0fdf4':'#fff7ed'};color:${sc.vehicle==='持込'?'#166534':'#c2410c'};border-radius:4px;padding:2px 7px;font-size:12px;">${sc.vehicle||'-'}</span></td>
      <td style="padding:8px 10px;">
        <button class="btn btn-ghost btn-sm" onclick="openStaffCondEdit('${s.name.replace(/'/g,"\\'")}')">条件編集</button>
        <button class="btn btn-primary btn-sm" onclick="openPrePayModal('${s.name.replace(/'/g,"\\'")}')">前払管理</button>
      </td>
    </tr>`;
  }).join('');

  return `
<div class="page-header"><div class="page-title">💴 スタッフ個別条件・支払設定</div></div>
${tabBar()}
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
  <div style="background:#eff6ff;border-radius:10px;padding:13px;"><div style="font-size:12px;color:#1e40af;font-weight:600;margin-bottom:3px;">件数連動型</div><div style="font-size:22px;font-weight:700;color:#1e40af;">${unitCount}名</div></div>
  <div style="background:#f5f3ff;border-radius:10px;padding:13px;"><div style="font-size:12px;color:#7c3aed;font-weight:600;margin-bottom:3px;">固定費型</div><div style="font-size:22px;font-weight:700;color:#7c3aed;">${fixedCount}名</div></div>
  <div style="background:#fff7ed;border-radius:10px;padding:13px;"><div style="font-size:12px;color:#c2410c;font-weight:600;margin-bottom:3px;">車両貸出控除あり</div><div style="font-size:22px;font-weight:700;color:#c2410c;">${rentalCount}名</div></div>
</div>
<div class="filter-bar" style="margin-bottom:14px;">
  <div><label class="form-label" style="font-size:11px;">拠点</label><select class="form-select" style="width:170px;" onchange="scFilterBase2=this.value;render();">
    <option value="">全拠点</option>${bases.map(b=>`<option value="${b}" ${scFilterBase2===b?'selected':''}>${b}</option>`).join('')}
  </select></div>
  <div><label class="form-label" style="font-size:11px;">役割</label><select class="form-select" style="width:130px;" onchange="scFilterRole2=this.value;render();">
    <option value="">全役割</option>${roles.map(r=>`<option value="${r}" ${scFilterRole2===r?'selected':''}>${r}</option>`).join('')}
  </select></div>
  <div style="font-size:13px;color:#64748b;align-self:flex-end;">${filtered.length}名表示中</div>
</div>
<div class="card" style="overflow-x:auto;">
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
      <th style="padding:8px 10px;text-align:left;">氏名 / 法人</th>
      <th style="padding:8px 10px;text-align:left;">拠点</th>
      <th style="padding:8px 10px;text-align:left;">役割</th>
      <th style="padding:8px 10px;text-align:right;">卸単価 / 固定費</th>
      <th style="padding:8px 10px;text-align:right;">車両控除</th>
      <th style="padding:8px 10px;text-align:center;">車両</th>
      <th style="padding:8px 10px;"></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

// ============================================================
// 法人別タブ
// ============================================================
function renderCorporateTab() {
  // 法人別にグルーピング
  const groups = {};
  for (const c of CORP_DEFS) groups[c.id] = { corp: c, members: [] };
  groups['individual'] = { corp: { id:'individual', label:'個人委託', color:'#374151', bg:'#f8fafc' }, members: [] };

  for (const s of STAFF_CONDITIONS) {
    const corp = getCorpForStaff(s.name);
    if (corp) groups[corp.id].members.push(s);
    else groups['individual'].members.push(s);
  }

  const corpCards = [...CORP_DEFS.map(c => groups[c.id]), groups['individual']].filter(g => g.members.length > 0).map(g => {
    const { corp, members } = g;
    const isIndiv = corp.id === 'individual';
    
    // 法人合計試算（ダミー件数）
    const totalUnit = members.reduce((sum, s) => {
      const sc = getStaffCond(s.name);
      if (sc.fixedFee) return sum + sc.fixedFee;
      return sum + (sc.unitPrice || 0) * 100; // 100件試算
    }, 0);

    const memberRows = members.map(s => {
      const sc = getStaffCond(s.name);
      const pd = staffPreData[s.name];
      const preCalc = pd ? calcPrePay(s.name) : null;
      return `<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:7px 10px;font-size:13px;font-weight:600;">${s.name.replace(/[（(][^）)]+[）)]/g,'').trim()}</td>
        <td style="padding:7px 10px;font-size:12px;color:#64748b;">${(sc.base||'').replace('郵便局','')}</td>
        <td style="padding:7px 10px;text-align:right;font-size:13px;">${sc.fixedFee?`<span style="color:#7c3aed;">固定 ¥${sc.fixedFee.toLocaleString()}</span>`:`<span>¥${(sc.unitPrice||0).toLocaleString()}/件</span>`}</td>
        <td style="padding:7px 10px;text-align:right;font-size:12px;color:#dc2626;">${sc.rentalFee>0?`−¥${sc.rentalFee.toLocaleString()}`:''}</td>
        <td style="padding:7px 10px;text-align:right;font-size:12px;">${preCalc?`<span style="color:${preCalc.available>=0?'#1e40af':'#dc2626'};font-weight:600;">前払可 ¥${preCalc.available.toLocaleString()}</span>`:'<span style="color:#94a3b8;">未設定</span>'}</td>
        <td style="padding:7px 10px;">
          <button class="btn btn-ghost btn-sm" onclick="openStaffCondEdit('${s.name.replace(/'/g,"\\'")}')">条件</button>
          <button class="btn btn-primary btn-sm" onclick="openPrePayModal('${s.name.replace(/'/g,"\\'")}')">前払</button>
        </td>
      </tr>`;
    }).join('');

    if (isIndiv) return ''; // 個人委託は別途省略

    return `
<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:16px;overflow:hidden;">
  <div style="background:${corp.bg};border-bottom:2px solid ${corp.color}20;padding:13px 16px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <span style="font-weight:700;font-size:15px;color:${corp.color};">${corp.label}</span>
      <span style="margin-left:10px;font-size:13px;color:#64748b;">${members.length}名</span>
    </div>
    <div style="font-size:12px;color:#64748b;">
      <span style="font-size:11px;">100件/月試算合計：</span>
      <span style="font-weight:700;color:${corp.color};font-size:15px;">¥${totalUnit.toLocaleString()}</span>
    </div>
  </div>
  <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f8fafc;">
        <th style="padding:6px 10px;text-align:left;">氏名</th>
        <th style="padding:6px 10px;text-align:left;">拠点</th>
        <th style="padding:6px 10px;text-align:right;">単価/固定費</th>
        <th style="padding:6px 10px;text-align:right;">車両控除</th>
        <th style="padding:6px 10px;text-align:right;">前払可能額</th>
        <th style="padding:6px 10px;"></th>
      </tr></thead>
      <tbody>${memberRows}</tbody>
    </table>
  </div>
</div>`;
  }).join('');

  return `
<div class="page-header"><div class="page-title">💴 スタッフ個別条件・支払設定</div></div>
${tabBar()}
<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#713f12;">
  💡 法人委託スタッフの表示です。各スタッフの「前払」ボタンから前払い可能額の計算・依頼書作成ができます。
</div>
${corpCards}`;
}

// ============================================================
// 条件編集モーダル
// ============================================================
function openStaffCondEdit(name) {
  const sc = getStaffCond(name);
  openModal(`個別条件編集 — ${name.replace(/[（(][^）)]+[）)]/g,'').trim()}`,`
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;font-size:13px;">
  <div class="form-group" style="margin:0;"><label class="form-label">所属拠点</label><input class="form-input" id="sced-base" value="${sc.base||''}"></div>
  <div class="form-group" style="margin:0;"><label class="form-label">契約形態</label><select class="form-select" id="sced-contract">
    <option ${sc.contract==='個人委託'?'selected':''}>個人委託</option>
    <option ${sc.contract==='法人委託'?'selected':''}>法人委託</option>
    <option ${sc.contract==='雇用'?'selected':''}>雇用</option>
  </select></div>
  <div class="form-group" style="margin:0;"><label class="form-label">役割</label><select class="form-select" id="sced-role">
    <option ${sc.role==='固定ドライバー'?'selected':''}>固定ドライバー</option>
    <option ${sc.role==='代走ドライバー'?'selected':''}>代走ドライバー</option>
    <option ${sc.role==='リーダー'?'selected':''}>リーダー</option>
  </select></div>
  <div class="form-group" style="margin:0;"><label class="form-label">車両</label><select class="form-select" id="sced-vehicle">
    <option ${sc.vehicle==='持込'?'selected':''}>持込</option>
    <option ${sc.vehicle==='貸出'?'selected':''}>貸出</option>
  </select></div>
</div>
<div style="background:#eff6ff;border-radius:8px;padding:12px;margin-bottom:10px;">
  <div style="font-weight:700;font-size:12px;color:#1e40af;margin-bottom:8px;">💴 支払条件</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
    <div class="form-group" style="margin:0;"><label class="form-label">卸単価（配達完了・円/件）</label>
      <input class="form-input" type="number" id="sced-unitprice" value="${sc.unitPrice||''}" placeholder="例：171">
      <span style="font-size:10px;color:#64748b;">転居・事故等も同単価</span></div>
    <div class="form-group" style="margin:0;"><label class="form-label">固定費（円/月）</label>
      <input class="form-input" type="number" id="sced-fixed" value="${sc.fixedFee||''}" placeholder="固定費型のみ"></div>
  </div>
</div>
<div class="form-group"><label class="form-label">その他条件・備考</label>
  <textarea class="form-input" id="sced-note" rows="2">${sc.cond||''}</textarea>
</div>`,
  `<button class="btn btn-outline" onclick="closeModalDirect()">キャンセル</button>
   <button class="btn btn-primary" onclick="saveStaffCond('${name.replace(/'/g,"\\'")}')">保存</button>`
  );
}

function saveStaffCond(name) {
  const up = document.getElementById('sced-unitprice')?.value;
  const ff = document.getElementById('sced-fixed')?.value;
  staffCondOverrides[name] = {
    base: document.getElementById('sced-base')?.value||'',
    contract: document.getElementById('sced-contract')?.value||'',
    role: document.getElementById('sced-role')?.value||'',
    vehicle: document.getElementById('sced-vehicle')?.value||'',
    unitPrice: up ? Number(up) : null,
    fixedFee: ff ? Number(ff) : null,
    cond: document.getElementById('sced-note')?.value||'',
  };
  // 既存のrentalFeeは保持
  const base = STAFF_CONDITIONS.find(s => s.name === name) || {};
  if (base.rentalFee) staffCondOverrides[name].rentalFee = base.rentalFee;
  closeModalDirect(); render();
}

// ============================================================
// 前払い管理モーダル
// ============================================================
function openPrePayModal(name) {
  const sc = getStaffCond(name);
  const pd = getPreData(name);
  const shortName = name.replace(/[（(][^）)]+[）)]/g,'').trim();
  renderPrePayModal(name, sc, pd, shortName);
}

function renderPrePayModal(name, sc, pd, shortName) {
  const calc = calcPrePay(name);
  const isFixed = !!sc.fixedFee;
  const availColor = calc.available >= 0 ? '#1e40af' : '#dc2626';

  // 件数入力（固定費型は非表示）
  const countInputHtml = isFixed ? `
<div style="background:#f5f3ff;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px;">
  <strong style="color:#7c3aed;">固定費型</strong> 月額 ¥${(sc.fixedFee||0).toLocaleString()} を売上として計算します。
</div>` : `
<div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:12px;">
  <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px;">📦 配達件数入力（売上計算用）<span style="font-size:11px;color:#94a3b8;font-weight:400;margin-left:6px;">卸単価 ¥${(sc.unitPrice||0).toLocaleString()}/件</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
    ${['配達完了①','配達完了②','転居大口等①','夜間配送','大配送','集荷①','集荷②','尋ねあたらず','その他事故'].map(item => {
      const id = 'ppc_'+item.replace(/[①②]/g, m=>m==='①'?'1':'2').replace(/\s/g,'_');
      return `<div style="display:flex;align-items:center;gap:6px;font-size:12px;">
        <label style="width:90px;color:#64748b;flex-shrink:0;">${item}</label>
        <input type="number" min="0" id="${id}" value="${pd.counts[item]||0}"
          style="width:60px;border:1px solid #e2e8f0;border-radius:4px;padding:2px 5px;text-align:right;font-size:12px;"
          oninput="updatePrePayCount('${name}','${item}',this.value)">
      </div>`;
    }).join('')}
  </div>
</div>`;

  // 控除予定額
  const deductHtml = `
<div style="background:#fff7ed;border-radius:8px;padding:12px;margin-bottom:12px;">
  <div style="font-size:12px;font-weight:600;color:#c2410c;margin-bottom:8px;">🔻 控除予定額</div>
  ${DEDUCT_CATS.map(c => `
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px;">
    <label style="width:120px;color:#64748b;flex-shrink:0;">${c.label}</label>
    <input type="number" min="0" id="ppd_${c.id}" value="${pd.deductPlan[c.id]||0}"
      style="width:90px;border:1px solid #fed7aa;border-radius:4px;padding:3px 7px;text-align:right;font-size:13px;"
      oninput="updatePrePayDeduct('${name}','${c.id}',this.value)">
    <span style="color:#94a3b8;font-size:11px;">円</span>
  </div>`).join('')}
  <div id="custom-deducts-${name.replace(/[^a-z0-9]/gi,'_')}">${renderCustomDeducts(name)}</div>
  <button onclick="addCustomDeduct('${name.replace(/'/g,"\\'")}')" style="margin-top:6px;padding:3px 10px;border:1px dashed #f97316;background:none;color:#f97316;border-radius:4px;font-size:12px;cursor:pointer;">＋ 控除項目を追加</button>
</div>`;

  // 前払い済み・追加入力
  const prepayHtml = `
<div style="background:#f0fdf4;border-radius:8px;padding:12px;margin-bottom:12px;">
  <div style="font-size:12px;font-weight:600;color:#166534;margin-bottom:8px;">💚 前払い申請</div>
  ${(pd.prepayEntries||[]).map((e,i) => `
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <input type="date" value="${e.date||''}" style="border:1px solid #bbf7d0;border-radius:4px;padding:3px 6px;font-size:12px;"
      onchange="updatePrepayEntry('${name}',${i},'date',this.value)">
    <input type="number" value="${e.amt||0}" style="width:90px;border:1px solid #bbf7d0;border-radius:4px;padding:3px 7px;text-align:right;font-size:13px;"
      onchange="updatePrepayEntry('${name}',${i},'amt',this.value)">
    <span style="font-size:11px;color:#64748b;">円</span>
    <button onclick="removePrepayEntry('${name}',${i})" style="border:none;background:#fee2e2;color:#dc2626;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;">削除</button>
  </div>`).join('')}
  <button onclick="addPrepayEntry('${name.replace(/'/g,"\\'")}')" style="padding:4px 12px;border:1px dashed #16a34a;background:none;color:#16a34a;border-radius:4px;font-size:12px;cursor:pointer;">＋ 前払い日を追加</button>
</div>`;

  // 計算結果表示
  const resultHtml = `
<div id="prepay-result-${name.replace(/[^a-z0-9]/gi,'_')}" style="background:#eff6ff;border-radius:10px;padding:14px;">
  <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
    <span>売上合計</span><strong>¥${calc.gross.toLocaleString()}</strong>
  </div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#dc2626;">
    <span>控除予定合計</span><span>−¥${calc.totalDeduct.toLocaleString()}</span>
  </div>
  ${calc.alreadyPrepaid>0?`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#16a34a;">
    <span>前払い申請済み</span><span>−¥${calc.alreadyPrepaid.toLocaleString()}</span>
  </div>`:''}
  <div style="border-top:2px solid #bfdbfe;margin-top:6px;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-weight:700;font-size:14px;">前払い可能額</span>
    <strong style="font-size:24px;color:${availColor};">¥${calc.available.toLocaleString()}</strong>
  </div>
  ${calc.available<0?`<div style="background:#fee2e2;color:#991b1b;border-radius:4px;padding:6px 10px;font-size:12px;margin-top:6px;">⚠️ マイナスですが前払いに応じることも可能です</div>`:''}
  ${calc.remaining!==calc.available?`<div style="font-size:12px;color:#64748b;margin-top:4px;text-align:right;">申請後残額：¥${calc.remaining.toLocaleString()}</div>`:''}
</div>`;

  openModal(`前払い管理 — ${shortName}`, `
<div style="font-size:12px;color:#64748b;margin-bottom:12px;">${sc.base||''} / ${sc.role||''} / ${sc.contract||''}</div>
${countInputHtml}${deductHtml}${prepayHtml}${resultHtml}`,
  `<button class="btn btn-outline" onclick="closeModalDirect()">閉じる</button>
   <button class="btn btn-primary" onclick="printPrepayRequest('${name.replace(/'/g,"\\'")}')">前払依頼書を印刷</button>`
  );
}

function renderCustomDeducts(name) {
  const pd = getPreData(name);
  return (pd.customDeducts||[]).map((c,i) => `
<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;font-size:13px;">
  <input type="text" value="${c.label||''}" placeholder="項目名" style="width:110px;border:1px solid #fed7aa;border-radius:4px;padding:3px 6px;font-size:12px;"
    onchange="updateCustomDeduct('${name}',${i},'label',this.value)">
  <input type="number" value="${c.amt||0}" style="width:85px;border:1px solid #fed7aa;border-radius:4px;padding:3px 7px;text-align:right;font-size:13px;"
    onchange="updateCustomDeduct('${name}',${i},'amt',this.value)">
  <span style="font-size:11px;color:#64748b;">円</span>
  <button onclick="removeCustomDeduct('${name}',${i})" style="border:none;background:#fee2e2;color:#dc2626;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;">×</button>
</div>`).join('');
}

function updatePrePayCount(name, item, val) {
  const pd = getPreData(name);
  pd.counts[item] = Number(val)||0;
  refreshPrePayResult(name);
}
function updatePrePayDeduct(name, catId, val) {
  const pd = getPreData(name);
  pd.deductPlan[catId] = Number(val)||0;
  refreshPrePayResult(name);
}
function addCustomDeduct(name) {
  const pd = getPreData(name);
  pd.customDeducts.push({ label:'', amt:0 });
  const key = name.replace(/[^a-z0-9]/gi,'_');
  const el = document.getElementById('custom-deducts-'+key);
  if (el) el.innerHTML = renderCustomDeducts(name);
}
function removeCustomDeduct(name, i) {
  const pd = getPreData(name);
  pd.customDeducts.splice(i,1);
  const key = name.replace(/[^a-z0-9]/gi,'_');
  const el = document.getElementById('custom-deducts-'+key);
  if (el) el.innerHTML = renderCustomDeducts(name);
  refreshPrePayResult(name);
}
function updateCustomDeduct(name, i, field, val) {
  const pd = getPreData(name);
  pd.customDeducts[i][field] = field==='amt' ? Number(val)||0 : val;
  refreshPrePayResult(name);
}
function addPrepayEntry(name) {
  const pd = getPreData(name);
  pd.prepayEntries.push({ date:'', amt:0 });
  openPrePayModal(name); // re-render modal
}
function removePrepayEntry(name, i) {
  const pd = getPreData(name);
  pd.prepayEntries.splice(i,1);
  openPrePayModal(name);
}
function updatePrepayEntry(name, i, field, val) {
  const pd = getPreData(name);
  pd.prepayEntries[i][field] = field==='amt' ? Number(val)||0 : val;
  refreshPrePayResult(name);
}
function refreshPrePayResult(name) {
  const calc = calcPrePay(name);
  const key = name.replace(/[^a-z0-9]/gi,'_');
  const el = document.getElementById('prepay-result-'+key);
  if (!el) return;
  const availColor = calc.available >= 0 ? '#1e40af' : '#dc2626';
  el.innerHTML = `
  <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span>売上合計</span><strong>¥${calc.gross.toLocaleString()}</strong></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#dc2626;"><span>控除予定合計</span><span>−¥${calc.totalDeduct.toLocaleString()}</span></div>
  ${calc.alreadyPrepaid>0?`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#16a34a;"><span>前払い申請済み</span><span>−¥${calc.alreadyPrepaid.toLocaleString()}</span></div>`:''}
  <div style="border-top:2px solid #bfdbfe;margin-top:6px;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-weight:700;font-size:14px;">前払い可能額</span>
    <strong style="font-size:24px;color:${availColor};">¥${calc.available.toLocaleString()}</strong>
  </div>
  ${calc.available<0?`<div style="background:#fee2e2;color:#991b1b;border-radius:4px;padding:6px 10px;font-size:12px;margin-top:6px;">⚠️ マイナスですが前払いに応じることも可能です</div>`:''}
  ${calc.remaining!==calc.available?`<div style="font-size:12px;color:#64748b;margin-top:4px;text-align:right;">申請後残額：¥${calc.remaining.toLocaleString()}</div>`:''}`;
}

// ============================================================
// 前払依頼書 印刷
// ============================================================
function printPrepayRequest(name) {
  const sc = getStaffCond(name);
  const pd = getPreData(name);
  const calc = calcPrePay(name);
  const shortName = name.replace(/[（(][^）)]+[）)]/g,'').trim();
  const today = new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});

  const deductRows = [
    ...DEDUCT_CATS.map(c => {
      const amt = pd.deductPlan[c.id]||0;
      return amt > 0 ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${c.label}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">¥${amt.toLocaleString()}</td></tr>` : '';
    }),
    ...(pd.customDeducts||[]).map(c => {
      return c.amt > 0 ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${c.label}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">¥${c.amt.toLocaleString()}</td></tr>` : '';
    })
  ].filter(Boolean).join('');

  const prepayRows = (pd.prepayEntries||[]).map(e =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${e.date}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">¥${Number(e.amt).toLocaleString()}</td></tr>`
  ).join('');

  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>前払依頼書 ${shortName}</title>
<style>
  body{font-family:'Hiragino Kaku Gothic ProN',sans-serif;max-width:700px;margin:30px auto;color:#1e293b;}
  h1{font-size:22px;text-align:center;border-bottom:3px solid #1e3a5f;padding-bottom:10px;margin-bottom:20px;}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;font-size:13px;}
  .info span{color:#64748b;}table{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;}
  th{background:#f1f5f9;padding:7px 10px;text-align:left;border-bottom:2px solid #cbd5e1;}
  .total-row{background:#f8fafc;font-weight:700;}
  .result-box{background:#eff6ff;border:2px solid #bfdbfe;border-radius:8px;padding:16px;margin-top:16px;display:flex;justify-content:space-between;align-items:center;}
  .sign-area{margin-top:30px;display:flex;gap:40px;justify-content:flex-end;}
  .sign-box{text-align:center;border-top:1px solid #94a3b8;width:120px;padding-top:4px;font-size:12px;color:#64748b;}
  @media print{body{margin:10px;}}
</style></head><body>
<h1>前払依頼書</h1>
<div class="info">
  <div><span>氏名：</span><strong>${shortName}</strong></div>
  <div><span>所属：</span>${sc.base||''}</div>
  <div><span>役割：</span>${sc.role||''}</div>
  <div><span>作成日：</span>${today}</div>
</div>
<table><thead><tr><th>項目</th><th style="text-align:right">金額</th></tr></thead><tbody>
  <tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><strong>売上合計</strong></td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">¥${calc.gross.toLocaleString()}</td></tr>
</tbody></table>
<table><thead><tr><th>控除項目</th><th style="text-align:right">予定額</th></tr></thead><tbody>
  ${deductRows}
  <tr class="total-row"><td style="padding:7px 10px;">控除合計</td><td style="padding:7px 10px;text-align:right;">¥${calc.totalDeduct.toLocaleString()}</td></tr>
</tbody></table>
${prepayRows ? `<table><thead><tr><th>前払い入金日</th><th style="text-align:right">金額</th></tr></thead><tbody>
  ${prepayRows}
  <tr class="total-row"><td style="padding:7px 10px;">前払い合計</td><td style="padding:7px 10px;text-align:right;">¥${calc.alreadyPrepaid.toLocaleString()}</td></tr>
</tbody></table>` : ''}
<div class="result-box">
  <span style="font-size:16px;font-weight:700;">前払い可能額</span>
  <span style="font-size:28px;font-weight:700;color:${calc.available>=0?'#1e40af':'#dc2626'};">¥${calc.available.toLocaleString()}</span>
</div>
${calc.available < 0 ? '<p style="color:#dc2626;font-size:12px;margin-top:8px;">※ 控除予定額が売上を上回っていますが、会社判断により前払いに応じる場合があります。</p>' : ''}
<div class="sign-area">
  <div class="sign-box">承認</div>
  <div class="sign-box">確認</div>
  <div class="sign-box">作成</div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
  win.document.close();
}

