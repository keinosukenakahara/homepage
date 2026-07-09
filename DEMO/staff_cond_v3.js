// ============================================================
// スタッフ個別条件・支払設定 v3（振込口座・自動売上・前払依頼書）
// ============================================================

// --- 法人定義 ---
const CORP_DEFS = [
  { id:'band',   label:'合同会社band',        keyword:'band',      color:'#1e40af', bg:'#eff6ff' },
  { id:'soei',   label:'創栄サポート株式会社', keyword:'創栄サポート', color:'#047857', bg:'#f0fdf4' },
  { id:'charm',  label:'株式会社Charment',     keyword:'Charment',  color:'#9333ea', bg:'#faf5ff' },
  { id:'rapid',  label:'合同会社Rapid Line',   keyword:'Rapid Line',color:'#c2410c', bg:'#fff7ed' },
  { id:'koko',   label:'こころ',               keyword:'こころ',    color:'#0e7490', bg:'#ecfeff' },
];

function getCorpForStaff(name) {
  for (const c of CORP_DEFS) { if (c.keyword && name.includes(c.keyword)) return c; }
  return null;
}

// --- 標準控除カテゴリ ---
const DEDUCT_CATS = [
  { id:'gasoline',  label:'ガソリン代' },
  { id:'vehicle',   label:'車両貸出費用' },
  { id:'prepaid',   label:'前払い済み委託費' },
  { id:'directpay', label:'滞納分直納' },
  { id:'insurance', label:'任意保険' },
  { id:'penalty',   label:'違約金' },
];

// --- 承認者リスト ---
let approvers = ['宮本正幸','石丸慎治','尾加龍之介','管理者'];

// --- 前払いデータ ---
const staffPreData = {};
function getPreData(name) {
  if (!staffPreData[name]) {
    staffPreData[name] = { fromDay:'1', toDay:'31', deductPlan:{}, customDeducts:[], prepayEntries:[] };
    const sc = getStaffCond(name);
    if (sc.rentalFee) staffPreData[name].deductPlan.vehicle = sc.rentalFee;
  }
  return staffPreData[name];
}

// --- スタッフ情報取得 ---
function getStaffCond(name) {
  const ov = staffCondOverrides[name];
  const base = STAFF_CONDITIONS.find(s => s.name === name) || {};
  return ov ? Object.assign({}, base, ov) : base;
}

// --- BASE_FULL_DATAからスタッフ件数を取得 ---
function normName(n) {
  return n.replace(/[（(][^）)]+[）)]/g,'').replace(/[\s　]/g,'');
}

function findStaffInBFData(scName) {
  const scNorm = normName(scName);
  for (const [bn, bd] of Object.entries(BASE_FULL_DATA)) {
    for (const s of (bd.staff||[])) {
      const bfNorm = normName(s.name);
      // 創栄サポート（水木勇貴）→水木勇貴のように逆順対応
      if (bfNorm === scNorm || bfNorm.includes(scNorm) || scNorm.includes(bfNorm)) {
        return { base: bn, staffObj: s };
      }
    }
  }
  return null;
}

function sumCountsFromBFData(scName, fromDay, toDay) {
  const found = findStaffInBFData(scName);
  if (!found) return null;
  const counts = {};
  const daily = found.staffObj.daily || {};
  const from = Number(fromDay || 1), to = Number(toDay || 31);
  for (const [day, data] of Object.entries(daily)) {
    if (Number(day) < from || Number(day) > to) continue;
    for (const [item, val] of Object.entries(data)) {
      counts[item] = (counts[item] || 0) + Number(val || 0);
    }
  }
  return counts;
}

// --- 支払試算 ---
function calcPayFromCounts(sc, counts) {
  if (!counts) return 0;
  const up = sc.unitPrice || 0;
  const stdP = { '夜間配送':31, '大配送':72, '集荷①':80, '集荷②':80 };
  const mainItems = ['配達完了①','配達完了②','転居大口等①','転居大口等②','尋ねあたらず','その他事故'];
  let gross = 0;
  for (const [item, qty] of Object.entries(counts)) {
    if (!qty) continue;
    gross += qty * (mainItems.includes(item) ? up : (stdP[item]||0));
  }
  return gross;
}

function calcPrePay(name) {
  const pd = getPreData(name);
  const sc = getStaffCond(name);
  let gross = 0;
  if (sc.fixedFee) {
    gross = sc.fixedFee;
  } else {
    const counts = sumCountsFromBFData(name, pd.fromDay, pd.toDay) || pd.manualCounts || {};
    gross = calcPayFromCounts(sc, counts);
  }
  let totalDeduct = 0;
  for (const c of DEDUCT_CATS) totalDeduct += Number(pd.deductPlan[c.id]||0);
  for (const c of (pd.customDeducts||[])) totalDeduct += Number(c.amt||0);
  const alreadyPrepaid = (pd.prepayEntries||[]).reduce((s,e)=>s+Number(e.amt||0),0);
  const available = gross - totalDeduct;
  const remaining = available - alreadyPrepaid;
  return { gross, totalDeduct, alreadyPrepaid, available, remaining };
}

function staffPayCalc(sc, counts) {
  if (!counts) counts = {'配達完了①':100,'配達完了②':0,'転居大口等①':5,'夜間配送':3,'大配送':2,'集荷①':4,'集荷②':0,'尋ねあたらず':2,'その他事故':1};
  if (sc.fixedFee) { const g=sc.fixedFee; const d=sc.rentalFee||0; return {gross:g,deduct:d,net:g-d,type:'fixed'}; }
  const g = calcPayFromCounts(sc, counts);
  const d = sc.rentalFee||0;
  return { gross:g, deduct:d, net:g-d, type:'unit' };
}

// --- 状態変数 ---
let scTab = 'individual';
let scFilterBase2 = '';
let scFilterRole2 = '';

// ============================================================
// メインページ
// ============================================================
function pageStaffConditions() {
  return scTab === 'corporate' ? renderCorporateTab() : renderIndividualTab();
}

function tabBar() {
  return `<div style="display:flex;gap:4px;margin-bottom:18px;border-bottom:2px solid #e2e8f0;">
    ${[['individual','👤 個人別一覧'],['corporate','🏢 法人別管理']].map(([id,lbl])=>`
    <button onclick="scTab='${id}';render();"
      style="padding:9px 18px;border:none;cursor:pointer;font-size:14px;font-weight:600;border-radius:8px 8px 0 0;margin-bottom:-2px;
      background:${scTab===id?'#fff':'transparent'};color:${scTab===id?'#1e40af':'#64748b'};
      border-bottom:${scTab===id?'2px solid #1e40af':'2px solid transparent'};">${lbl}</button>`).join('')}
  </div>`;
}

// ============================================================
// 個人別タブ
// ============================================================
function renderIndividualTab() {
  const bases = [...new Set(STAFF_CONDITIONS.map(s=>s.base))].sort();
  const roles = [...new Set(STAFF_CONDITIONS.map(s=>s.role))].sort();
  const filtered = STAFF_CONDITIONS.filter(s=>
    (!scFilterBase2||s.base===scFilterBase2)&&(!scFilterRole2||s.role===scFilterRole2));
  const unitCount=filtered.filter(s=>!s.fixedFee&&s.unitPrice).length;
  const fixedCount=filtered.filter(s=>s.fixedFee).length;
  const rentalCount=filtered.filter(s=>s.rentalFee>0).length;
  const rows = filtered.map(s=>{
    const sc=getStaffCond(s.name);
    const corp=getCorpForStaff(s.name);
    const hasOv=!!staffCondOverrides[s.name];
    return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 10px;">
        <div style="font-weight:600;font-size:13px;">${s.name.replace(/[（(][^）)]+[）)]/g,'').trim()}${hasOv?'<span style="background:#fef9c3;color:#713f12;font-size:10px;border-radius:3px;padding:1px 5px;margin-left:4px;">編集済</span>':''}</div>
        <div style="margin-top:2px;">${corp?`<span style="background:${corp.bg};color:${corp.color};border-radius:3px;padding:1px 6px;font-size:10px;">${corp.label}</span>`:`<span style="color:#94a3b8;font-size:10px;">${sc.contract}</span>`}</div>
      </td>
      <td style="padding:8px 10px;font-size:13px;">${(sc.base||'').replace('郵便局','')}</td>
      <td style="padding:8px 10px;"><span style="background:${sc.role==='リーダー'?'#fef3c7':'#eff6ff'};color:${sc.role==='リーダー'?'#92400e':'#1e40af'};border-radius:4px;padding:2px 7px;font-size:12px;">${sc.role||''}</span></td>
      <td style="padding:8px 10px;text-align:right;font-size:13px;">${sc.fixedFee?`<span style="color:#7c3aed;font-weight:700;">固定 ¥${sc.fixedFee.toLocaleString()}/月</span>`:`<span style="font-weight:700;">¥${(sc.unitPrice||0).toLocaleString()}</span><span style="color:#64748b;font-size:11px;">/件</span>`}</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px;">${sc.rentalFee>0?`<span style="color:#dc2626;">−¥${sc.rentalFee.toLocaleString()}</span>`:'<span style="color:#94a3b8;">−</span>'}</td>
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
      <th style="padding:8px 10px;text-align:left;">氏名 / 法人</th><th style="padding:8px 10px;text-align:left;">拠点</th>
      <th style="padding:8px 10px;text-align:left;">役割</th><th style="padding:8px 10px;text-align:right;">卸単価 / 固定費</th>
      <th style="padding:8px 10px;text-align:right;">車両控除</th><th style="padding:8px 10px;text-align:center;">車両</th>
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
  const groups = {};
  for (const c of CORP_DEFS) groups[c.id]={corp:c,members:[]};
  groups['individual']={corp:{id:'individual',label:'個人委託（抜粋）',color:'#374151',bg:'#f8fafc'},members:[]};
  for (const s of STAFF_CONDITIONS) {
    const c=getCorpForStaff(s.name);
    if(c) groups[c.id].members.push(s);
    // else groups['individual'].members.push(s);
  }
  return `
<div class="page-header"><div class="page-title">💴 スタッフ個別条件・支払設定</div></div>
${tabBar()}
<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#713f12;">
  💡 各スタッフの「前払」ボタンから前払可能額の計算・依頼書作成ができます。
</div>
${CORP_DEFS.map(c=>{
  const {members}=groups[c.id];
  if(!members.length) return '';
  const rows=members.map(s=>{
    const sc=getStaffCond(s.name);
    const pd=staffPreData[s.name];
    const preCalc=pd?calcPrePay(s.name):null;
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
  return `
<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:16px;overflow:hidden;">
  <div style="background:${c.bg};border-bottom:2px solid ${c.color}30;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-weight:700;font-size:15px;color:${c.color};">${c.label}</span>
    <span style="font-size:13px;color:#64748b;">${members.length}名</span>
  </div>
  <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f8fafc;"><th style="padding:6px 10px;text-align:left;">氏名</th><th style="padding:6px 10px;text-align:left;">拠点</th><th style="padding:6px 10px;text-align:right;">単価</th><th style="padding:6px 10px;text-align:right;">控除</th><th style="padding:6px 10px;text-align:right;">前払可能額</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`;
}).join('')}`;
}

// ============================================================
// 条件編集モーダル（振込口座追加）
// ============================================================
function openStaffCondEdit(name) {
  const sc = getStaffCond(name);
  const shortName = name.replace(/[（(][^）)]+[）)]/g,'').trim();
  openModal(`個別条件編集 — ${shortName}`, `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
  <div class="form-group" style="margin:0;"><label class="form-label">所属拠点</label><input class="form-input" id="sced-base" value="${sc.base||''}"></div>
  <div class="form-group" style="margin:0;"><label class="form-label">契約形態</label><select class="form-select" id="sced-contract">
    <option ${sc.contract==='個人委託'?'selected':''}>個人委託</option><option ${sc.contract==='法人委託'?'selected':''}>法人委託</option><option ${sc.contract==='雇用'?'selected':''}>雇用</option>
  </select></div>
  <div class="form-group" style="margin:0;"><label class="form-label">役割</label><select class="form-select" id="sced-role">
    <option ${sc.role==='固定ドライバー'?'selected':''}>固定ドライバー</option><option ${sc.role==='代走ドライバー'?'selected':''}>代走ドライバー</option><option ${sc.role==='リーダー'?'selected':''}>リーダー</option>
  </select></div>
  <div class="form-group" style="margin:0;"><label class="form-label">車両</label><select class="form-select" id="sced-vehicle">
    <option ${sc.vehicle==='持込'?'selected':''}>持込</option><option ${sc.vehicle==='貸出'?'selected':''}>貸出</option>
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
<div style="background:#f0fdf4;border-radius:8px;padding:12px;margin-bottom:10px;">
  <div style="font-weight:700;font-size:12px;color:#166534;margin-bottom:8px;">🏦 振込口座</div>
  <textarea class="form-input" id="sced-bank" rows="2" placeholder="例：広島銀行 横川支店 普通 1234567 スズキタロウ">${sc.bankAccount||sc.bank||''}</textarea>
</div>
<div class="form-group"><label class="form-label">その他条件・備考</label>
  <textarea class="form-input" id="sced-note" rows="2">${sc.cond||''}</textarea>
</div>`,
  `<button class="btn btn-outline" onclick="closeModalDirect()">キャンセル</button>
   <button class="btn btn-primary" onclick="saveStaffCond('${name.replace(/'/g,"\\'")}')">保存</button>`
  );
}

function saveStaffCond(name) {
  const up=document.getElementById('sced-unitprice')?.value;
  const ff=document.getElementById('sced-fixed')?.value;
  const base = STAFF_CONDITIONS.find(s=>s.name===name)||{};
  staffCondOverrides[name]={
    base:document.getElementById('sced-base')?.value||'',
    contract:document.getElementById('sced-contract')?.value||'',
    role:document.getElementById('sced-role')?.value||'',
    vehicle:document.getElementById('sced-vehicle')?.value||'',
    unitPrice:up?Number(up):null,
    fixedFee:ff?Number(ff):null,
    rentalFee:base.rentalFee||0,
    bankAccount:document.getElementById('sced-bank')?.value||'',
    cond:document.getElementById('sced-note')?.value||'',
  };
  closeModalDirect(); render();
}

// ============================================================
// 前払い管理モーダル
// ============================================================
function openPrePayModal(name) {
  const sc=getStaffCond(name);
  const pd=getPreData(name);
  const shortName=name.replace(/[（(][^）)]+[）)]/g,'').trim();
  const calc=calcPrePay(name);
  const availColor=calc.available>=0?'#1e40af':'#dc2626';

  // 自動集計された件数を表示
  const autoFound=findStaffInBFData(name);
  const autoCounts=autoFound?sumCountsFromBFData(name,pd.fromDay,pd.toDay):null;
  const isFixed=!!sc.fixedFee;

  const salesHtml = isFixed ? `
<div style="background:#f5f3ff;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px;">
  <strong style="color:#7c3aed;">固定費型</strong> 月額 ¥${(sc.fixedFee||0).toLocaleString()} を売上として計算します。
</div>` : `
<div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:12px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
    <div style="font-size:12px;font-weight:600;color:#374151;">📦 集計期間 <span style="font-size:11px;font-weight:400;color:#94a3b8;margin-left:4px;">卸単価 ¥${(sc.unitPrice||0).toLocaleString()}/件</span></div>
    <div style="display:flex;gap:6px;align-items:center;font-size:12px;">
      <input type="number" min="1" max="31" value="${pd.fromDay||1}" style="width:45px;border:1px solid #e2e8f0;border-radius:4px;padding:2px 5px;text-align:center;"
        onchange="updatePrePayRange('${name}','from',this.value)">日〜
      <input type="number" min="1" max="31" value="${pd.toDay||31}" style="width:45px;border:1px solid #e2e8f0;border-radius:4px;padding:2px 5px;text-align:center;"
        onchange="updatePrePayRange('${name}','to',this.value)">日
    </div>
  </div>
  ${autoFound ? `
  <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#eff6ff;">
        <th style="padding:4px 8px;text-align:left;">項目</th><th style="padding:4px 8px;text-align:right;">件数</th><th style="padding:4px 8px;text-align:right;">単価</th><th style="padding:4px 8px;text-align:right;">小計</th>
      </tr></thead>
      <tbody>
        ${Object.entries(autoCounts||{}).filter(([,v])=>v>0).map(([item,qty])=>{
          const mainItems=['配達完了①','配達完了②','転居大口等①','転居大口等②','尋ねあたらず','その他事故'];
          const stdP={'夜間配送':31,'大配送':72,'集荷①':80,'集荷②':80};
          const p=mainItems.includes(item)?(sc.unitPrice||0):(stdP[item]||0);
          return `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:3px 8px;">${item}</td>
            <td style="padding:3px 8px;text-align:right;">${qty}</td>
            <td style="padding:3px 8px;text-align:right;">¥${p.toLocaleString()}</td>
            <td style="padding:3px 8px;text-align:right;font-weight:600;">¥${(qty*p).toLocaleString()}</td>
          </tr>`;
        }).join('')}
        <tr style="background:#eff6ff;font-weight:700;">
          <td colspan="3" style="padding:5px 8px;">売上合計</td>
          <td style="padding:5px 8px;text-align:right;color:#1e40af;">¥${calc.gross.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>` : `<div style="color:#f97316;font-size:12px;background:#fff7ed;border-radius:6px;padding:8px 10px;">
    ⚠️ 配達件数表に一致するデータが見つかりません。<br>卸単価 × 件数で売上を計算するには件数が必要です。
    <div style="margin-top:8px;"><input type="number" id="manual-gross-${name.replace(/[^a-z0-9]/gi,'_')}" value="${(getPreData(name).manualGross||0)}" 
      style="border:1px solid #fed7aa;border-radius:4px;padding:3px 8px;width:100px;text-align:right;" placeholder="売上金額">
    <span style="font-size:11px;"> 円（手入力）</span>
    <button onclick="setManualGross('${name.replace(/'/g,"\\'")}',document.getElementById('manual-gross-${name.replace(/[^a-z0-9]/gi,'_')}').value)" 
      style="margin-left:6px;padding:3px 8px;background:#f97316;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;">適用</button></div>
  </div>`}
</div>`;

  const deductHtml=`
<div style="background:#fff7ed;border-radius:8px;padding:12px;margin-bottom:12px;">
  <div style="font-size:12px;font-weight:600;color:#c2410c;margin-bottom:8px;">🔻 控除予定額</div>
  ${DEDUCT_CATS.map(c=>`
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
    <label style="width:120px;font-size:12px;color:#64748b;flex-shrink:0;">${c.label}</label>
    <input type="number" min="0" id="ppd_${c.id}" value="${pd.deductPlan[c.id]||0}"
      style="width:90px;border:1px solid #fed7aa;border-radius:4px;padding:2px 7px;text-align:right;font-size:13px;"
      oninput="updatePrePayDeduct('${name}','${c.id}',this.value)"> <span style="font-size:11px;color:#94a3b8;">円</span>
  </div>`).join('')}
  <div id="custom-deducts-${name.replace(/[^a-z0-9]/gi,'_')}">${renderCustomDeducts(name)}</div>
  <button onclick="addCustomDeduct('${name.replace(/'/g,"\\'")}')" style="margin-top:4px;padding:3px 10px;border:1px dashed #f97316;background:none;color:#f97316;border-radius:4px;font-size:12px;cursor:pointer;">＋ 控除項目を追加</button>
</div>`;

  const prepayHtml=`
<div style="background:#f0fdf4;border-radius:8px;padding:12px;margin-bottom:12px;">
  <div style="font-size:12px;font-weight:600;color:#166534;margin-bottom:8px;">💚 前払い申請</div>
  ${(pd.prepayEntries||[]).map((e,i)=>`
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
    <input type="date" value="${e.date||''}" style="border:1px solid #bbf7d0;border-radius:4px;padding:2px 6px;font-size:12px;"
      onchange="updatePrepayEntry('${name}',${i},'date',this.value)">
    <input type="number" value="${e.amt||0}" style="width:88px;border:1px solid #bbf7d0;border-radius:4px;padding:2px 6px;text-align:right;font-size:13px;"
      onchange="updatePrepayEntry('${name}',${i},'amt',this.value)"> <span style="font-size:11px;color:#64748b;">円</span>
    <button onclick="removePrepayEntry('${name}',${i})" style="border:none;background:#fee2e2;color:#dc2626;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;">削除</button>
  </div>`).join('')}
  <button onclick="addPrepayEntry('${name.replace(/'/g,"\\'")}')" style="padding:3px 12px;border:1px dashed #16a34a;background:none;color:#16a34a;border-radius:4px;font-size:12px;cursor:pointer;">＋ 前払い日を追加</button>
</div>`;

  const resultHtml=`
<div id="prepay-result-${name.replace(/[^a-z0-9]/gi,'_')}" style="background:#eff6ff;border-radius:10px;padding:14px;">
  ${buildResultHtml(calc)}
</div>`;

  openModal(`前払い管理 — ${shortName}`,
    `<div style="font-size:12px;color:#64748b;margin-bottom:10px;">${sc.base||''} / ${sc.role||''}</div>
    ${salesHtml}${deductHtml}${prepayHtml}${resultHtml}`,
    `<button class="btn btn-outline" onclick="closeModalDirect()">閉じる</button>
     <button class="btn btn-primary" onclick="openApproverSelect('${name.replace(/'/g,"\\'")}')">前払依頼書を印刷</button>`
  );
}

function buildResultHtml(calc) {
  const ac=calc.available>=0?'#1e40af':'#dc2626';
  return `
  <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span>売上合計</span><strong>¥${calc.gross.toLocaleString()}</strong></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#dc2626;"><span>控除予定合計</span><span>−¥${calc.totalDeduct.toLocaleString()}</span></div>
  ${calc.alreadyPrepaid>0?`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#16a34a;"><span>前払い申請済み</span><span>−¥${calc.alreadyPrepaid.toLocaleString()}</span></div>`:''}
  <div style="border-top:2px solid #bfdbfe;margin-top:6px;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-weight:700;font-size:14px;">前払い可能額</span>
    <strong style="font-size:24px;color:${ac};">¥${calc.available.toLocaleString()}</strong>
  </div>
  ${calc.available<0?`<div style="background:#fee2e2;color:#991b1b;border-radius:4px;padding:6px 10px;font-size:12px;margin-top:6px;">⚠️ マイナスですが前払いに応じることも可能です</div>`:''}
  ${calc.remaining!==calc.available?`<div style="font-size:12px;color:#64748b;margin-top:4px;text-align:right;">申請後残額：¥${calc.remaining.toLocaleString()}</div>`:''}`;
}

function updatePrePayRange(name, which, val) {
  const pd=getPreData(name);
  if(which==='from') pd.fromDay=val; else pd.toDay=val;
  refreshPrePayResult(name);
  // Re-render to refresh counts table
  openPrePayModal(name);
}

function setManualGross(name, val) {
  const pd=getPreData(name);
  pd.manualGross=Number(val)||0;
  pd.manualCounts={'配達完了①': Math.round(pd.manualGross / (getStaffCond(name).unitPrice||1))};
  refreshPrePayResult(name);
}

function updatePrePayDeduct(name,catId,val) {
  getPreData(name).deductPlan[catId]=Number(val)||0;
  refreshPrePayResult(name);
}
function addCustomDeduct(name) {
  getPreData(name).customDeducts.push({label:'',amt:0});
  const el=document.getElementById('custom-deducts-'+name.replace(/[^a-z0-9]/gi,'_'));
  if(el) el.innerHTML=renderCustomDeducts(name);
}
function removeCustomDeduct(name,i) {
  getPreData(name).customDeducts.splice(i,1);
  const el=document.getElementById('custom-deducts-'+name.replace(/[^a-z0-9]/gi,'_'));
  if(el) el.innerHTML=renderCustomDeducts(name);
  refreshPrePayResult(name);
}
function updateCustomDeduct(name,i,field,val) {
  const c=getPreData(name).customDeducts[i];
  c[field]=field==='amt'?Number(val)||0:val;
  refreshPrePayResult(name);
}
function addPrepayEntry(name) {
  getPreData(name).prepayEntries.push({date:'',amt:0});
  openPrePayModal(name);
}
function removePrepayEntry(name,i) {
  getPreData(name).prepayEntries.splice(i,1);
  openPrePayModal(name);
}
function updatePrepayEntry(name,i,field,val) {
  const e=getPreData(name).prepayEntries[i];
  e[field]=field==='amt'?Number(val)||0:val;
  refreshPrePayResult(name);
}
function refreshPrePayResult(name) {
  const el=document.getElementById('prepay-result-'+name.replace(/[^a-z0-9]/gi,'_'));
  if(!el) return;
  el.innerHTML=buildResultHtml(calcPrePay(name));
}
function renderCustomDeducts(name) {
  return (getPreData(name).customDeducts||[]).map((c,i)=>`
<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
  <input type="text" value="${c.label||''}" placeholder="項目名" style="width:100px;border:1px solid #fed7aa;border-radius:4px;padding:2px 5px;font-size:12px;"
    onchange="updateCustomDeduct('${name}',${i},'label',this.value)">
  <input type="number" value="${c.amt||0}" style="width:80px;border:1px solid #fed7aa;border-radius:4px;padding:2px 6px;text-align:right;font-size:12px;"
    onchange="updateCustomDeduct('${name}',${i},'amt',this.value)">
  <span style="font-size:11px;color:#64748b;">円</span>
  <button onclick="removeCustomDeduct('${name}',${i})" style="border:none;background:#fee2e2;color:#dc2626;border-radius:4px;padding:1px 5px;cursor:pointer;font-size:11px;">×</button>
</div>`).join('');
}

// ============================================================
// 承認者選択モーダル
// ============================================================
function openApproverSelect(name) {
  const shortName=name.replace(/[（(][^）)]+[）)]/g,'').trim();
  openModal('承認者を選択', `
<div style="font-size:13px;color:#64748b;margin-bottom:14px;">${shortName} の前払依頼書の承認者を選択してください。</div>
<div class="form-group">
  <label class="form-label">承認者</label>
  <select class="form-select" id="approver-select" style="width:100%;">
    ${approvers.map(a=>`<option value="${a}">${a}</option>`).join('')}
  </select>
</div>
<div style="display:flex;gap:8px;margin-top:10px;">
  <input type="text" id="new-approver-input" placeholder="承認者名を追加" class="form-input" style="flex:1;">
  <button onclick="addApprover()" class="btn btn-outline" style="white-space:nowrap;">追加</button>
</div>
<div id="approver-list" style="margin-top:10px;font-size:12px;color:#64748b;">
  ${approvers.map((a,i)=>`<span style="background:#f1f5f9;border-radius:4px;padding:2px 8px;margin-right:4px;margin-bottom:4px;display:inline-block;">${a} <span onclick="removeApprover(${i})" style="cursor:pointer;color:#dc2626;">×</span></span>`).join('')}
</div>`,
  `<button class="btn btn-outline" onclick="closeModalDirect()">キャンセル</button>
   <button class="btn btn-primary" onclick="printPrepayRequest('${name.replace(/'/g,"\\'")}',document.getElementById('approver-select')?.value)">印刷</button>`
  );
}

function addApprover() {
  const el=document.getElementById('new-approver-input');
  const name=el?.value?.trim();
  if(!name) return;
  approvers.push(name);
  el.value='';
  const sel=document.getElementById('approver-select');
  if(sel){sel.innerHTML=approvers.map(a=>`<option value="${a}">${a}</option>`).join('');sel.value=name;}
  const list=document.getElementById('approver-list');
  if(list) list.innerHTML=approvers.map((a,i)=>`<span style="background:#f1f5f9;border-radius:4px;padding:2px 8px;margin-right:4px;margin-bottom:4px;display:inline-block;">${a} <span onclick="removeApprover(${i})" style="cursor:pointer;color:#dc2626;">×</span></span>`).join('');
}
function removeApprover(i) {
  approvers.splice(i,1);
  const list=document.getElementById('approver-list');
  if(list) list.innerHTML=approvers.map((a,j)=>`<span style="background:#f1f5f9;border-radius:4px;padding:2px 8px;margin-right:4px;margin-bottom:4px;display:inline-block;">${a} <span onclick="removeApprover(${j})" style="cursor:pointer;color:#dc2626;">×</span></span>`).join('');
  const sel=document.getElementById('approver-select');
  if(sel) sel.innerHTML=approvers.map(a=>`<option value="${a}">${a}</option>`).join('');
}

// ============================================================
// 前払依頼書 印刷
// ============================================================
function printPrepayRequest(name, approverName) {
  const sc=getStaffCond(name);
  const pd=getPreData(name);
  const calc=calcPrePay(name);
  const shortName=name.replace(/[（(][^）)]+[）)]/g,'').trim();
  const today=new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
  const bankAccount=sc.bankAccount||sc.bank||'（未登録）';
  const approver=approverName||'';

  // 件数明細
  const countRows=[];
  if(!sc.fixedFee){
    const autoCounts=sumCountsFromBFData(name,pd.fromDay,pd.toDay)||pd.manualCounts||{};
    const stdP={'夜間配送':31,'大配送':72,'集荷①':80,'集荷②':80};
    const mainItems=['配達完了①','配達完了②','転居大口等①','転居大口等②','尋ねあたらず','その他事故'];
    for(const [item,qty] of Object.entries(autoCounts)){
      if(!qty) continue;
      const p=mainItems.includes(item)?(sc.unitPrice||0):(stdP[item]||0);
      countRows.push(`<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;">${item}</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${qty}件</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">¥${p}</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">¥${(qty*p).toLocaleString()}</td></tr>`);
    }
  }

  const deductRows=[];
  for(const c of DEDUCT_CATS){const a=pd.deductPlan[c.id]||0;if(a>0)deductRows.push(`<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;">${c.label}</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">−¥${a.toLocaleString()}</td></tr>`);}
  for(const c of (pd.customDeducts||[])){if(c.amt>0)deductRows.push(`<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;">${c.label}</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">−¥${c.amt.toLocaleString()}</td></tr>`);}

  const prepayRows=(pd.prepayEntries||[]).filter(e=>e.amt>0).map(e=>`<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;">${e.date}</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">¥${Number(e.amt).toLocaleString()}</td></tr>`).join('');

  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>前払依頼書 ${shortName}</title>
<style>
  body{font-family:'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;max-width:720px;margin:30px auto;color:#1e293b;font-size:13px;}
  h1{font-size:20px;text-align:center;border-bottom:3px solid #1e3a5f;padding-bottom:8px;margin-bottom:16px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:6px;}
  .info-grid .lbl{color:#64748b;font-size:11px;}
  .info-grid .val{font-weight:600;}
  .bank-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 12px;margin-bottom:16px;}
  table{width:100%;border-collapse:collapse;margin-bottom:14px;}
  th{background:#f1f5f9;padding:6px 10px;text-align:left;border-bottom:2px solid #cbd5e1;font-size:12px;}
  .total-row td{font-weight:700;background:#f8fafc;padding:6px 10px;}
  .pay-result{background:#eff6ff;border:2px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0;display:flex;justify-content:space-between;align-items:center;}
  .sign-area{margin-top:30px;display:flex;gap:30px;justify-content:flex-end;}
  .sign-box{text-align:center;min-width:100px;}
  .sign-box .name{border:1px solid #cbd5e1;border-radius:4px;padding:18px 10px;margin-bottom:4px;min-width:100px;}
  .sign-box .lbl{font-size:11px;color:#64748b;}
  @media print{body{margin:10px;}}
</style></head><body>
<h1>前払依頼書</h1>
<div class="info-grid">
  <div><div class="lbl">氏名</div><div class="val">${shortName}</div></div>
  <div><div class="lbl">所属</div><div class="val">${sc.base||''}</div></div>
  <div><div class="lbl">役割</div><div class="val">${sc.role||''}</div></div>
  <div><div class="lbl">作成日</div><div class="val">${today}</div></div>
  <div style="grid-column:span 2;"><div class="lbl">集計期間</div><div class="val">${pd.fromDay}日〜${pd.toDay}日</div></div>
</div>
<div class="bank-box">
  <div style="font-size:11px;color:#166534;margin-bottom:4px;">🏦 振込口座</div>
  <div style="font-weight:600;white-space:pre-line;">${bankAccount}</div>
</div>
${countRows.length?`<table><thead><tr><th>配達項目</th><th style="text-align:right">件数</th><th style="text-align:right">単価</th><th style="text-align:right">金額</th></tr></thead><tbody>
  ${countRows.join('')}
  <tr class="total-row"><td colspan="3">売上合計</td><td style="text-align:right;color:#1e40af;">¥${calc.gross.toLocaleString()}</td></tr>
</tbody></table>`:sc.fixedFee?`<table><thead><tr><th>項目</th><th style="text-align:right">金額</th></tr></thead><tbody><tr><td>固定費</td><td style="text-align:right;font-weight:700;">¥${calc.gross.toLocaleString()}</td></tr></tbody></table>`:''}
${deductRows.length?`<table><thead><tr><th>控除項目</th><th style="text-align:right">金額</th></tr></thead><tbody>
  ${deductRows.join('')}
  <tr class="total-row"><td>控除合計</td><td style="text-align:right;">−¥${calc.totalDeduct.toLocaleString()}</td></tr>
</tbody></table>`:''}
${prepayRows?`<table><thead><tr><th>前払い入金日</th><th style="text-align:right">金額</th></tr></thead><tbody>
  ${prepayRows}
  <tr class="total-row"><td>前払い合計</td><td style="text-align:right;">¥${calc.alreadyPrepaid.toLocaleString()}</td></tr>
</tbody></table>`:''}
<div class="pay-result">
  <span style="font-size:15px;font-weight:700;">前払い申請金額</span>
  <span style="font-size:26px;font-weight:700;color:#1e40af;">¥${calc.alreadyPrepaid>0?calc.alreadyPrepaid.toLocaleString():calc.available.toLocaleString()}</span>
</div>
${calc.available<0?'<p style="color:#dc2626;font-size:12px;">※ 控除予定額が売上を上回っています。会社判断により前払いに応じる場合があります。</p>':''}
<div class="sign-area">
  <div class="sign-box"><div class="name">${approver}</div><div class="lbl">承認</div></div>
  <div class="sign-box"><div class="name"></div><div class="lbl">確認</div></div>
  <div class="sign-box"><div class="name"></div><div class="lbl">作成</div></div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
  win.document.close();
  closeModalDirect();
}
