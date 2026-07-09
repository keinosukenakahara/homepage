
// ============================================================
// スタッフ個別条件・支払設定
// ============================================================
let scFilterBase = '';
let scFilterRole = '';
let scEditId = null;

function getStaffCond(name) {
  // overrides優先、なければマスタデータ
  const ov = staffCondOverrides[name];
  const base = STAFF_CONDITIONS.find(s => s.name === name) || {};
  return ov ? Object.assign({}, base, ov) : base;
}

function staffPayCalc(sc, counts) {
  // countsは {配達完了①:N, 配達完了②:N, 夜間配送:N, ...} or null(試算用ダミー)
  if (!counts) counts = { '配達完了①': 100, '配達完了②': 0, '転居大口等①': 5, '転居大口等②': 0, '夜間配送': 3, '大配送': 2, '集荷①': 4, '集荷②': 0, '尋ねあたらず': 2, 'その他事故': 1 };
  
  if (sc.fixedFee) {
    // 固定費型
    const gross = sc.fixedFee;
    const deduct = sc.rentalFee || 0;
    return { gross, deduct, net: gross - deduct, type: 'fixed' };
  }
  
  const up = sc.unitPrice || 0;
  // 配達完了系は個別単価、それ以外は標準卸単価
  const stdPrices = { '夜間配送': 31, '大配送': 72, '集荷①': 80, '集荷②': 80 };
  let gross = 0;
  for (const [item, qty] of Object.entries(counts)) {
    if (!qty) continue;
    let p = 0;
    if (['配達完了①', '配達完了②', '転居大口等①', '転居大口等②', '尋ねあたらず', 'その他事故'].includes(item)) {
      p = up;
    } else {
      p = stdPrices[item] || 0;
    }
    gross += qty * p;
  }
  const deduct = sc.rentalFee || 0;
  return { gross, deduct, net: gross - deduct, type: 'unit' };
}

function openStaffCondEdit(name) {
  const sc = getStaffCond(name);
  openModal(`個別条件編集 — ${name}`, `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
  <div class="form-group">
    <label class="form-label">所属拠点</label>
    <input class="form-input" id="sced-base" value="${sc.base||''}">
  </div>
  <div class="form-group">
    <label class="form-label">契約形態</label>
    <select class="form-select" id="sced-contract">
      <option ${sc.contract==='個人委託'?'selected':''}>個人委託</option>
      <option ${sc.contract==='法人委託'?'selected':''}>法人委託</option>
      <option ${sc.contract==='雇用'?'selected':''}>雇用</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">役割</label>
    <select class="form-select" id="sced-role">
      <option ${sc.role==='固定ドライバー'?'selected':''}>固定ドライバー</option>
      <option ${sc.role==='代走ドライバー'?'selected':''}>代走ドライバー</option>
      <option ${sc.role==='リーダー'?'selected':''}>リーダー</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">車両</label>
    <select class="form-select" id="sced-vehicle">
      <option ${sc.vehicle==='持込'?'selected':''}>持込</option>
      <option ${sc.vehicle==='貸出'?'selected':''}>貸出</option>
    </select>
  </div>
</div>
<div style="background:#eff6ff;border-radius:10px;padding:14px;margin-bottom:12px;">
  <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:#1e40af;">💴 支払条件</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
    <div class="form-group" style="margin:0;">
      <label class="form-label">卸単価（配達完了・円/件）</label>
      <input class="form-input" type="number" id="sced-unitprice" value="${sc.unitPrice||''}" placeholder="例：171">
      <span style="font-size:11px;color:#64748b;">転居・事故等も同単価で計算</span>
    </div>
    <div class="form-group" style="margin:0;">
      <label class="form-label">固定費（円/月）</label>
      <input class="form-input" type="number" id="sced-fixed" value="${sc.fixedFee||''}" placeholder="例：400000">
      <span style="font-size:11px;color:#64748b;">固定費型の場合に入力</span>
    </div>
  </div>
</div>
<div style="background:#fff7ed;border-radius:10px;padding:14px;margin-bottom:12px;">
  <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:#c2410c;">🔻 控除項目</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
    <div class="form-group" style="margin:0;">
      <label class="form-label">車両貸出費用（円/月）</label>
      <input class="form-input" type="number" id="sced-rental" value="${sc.rentalFee||0}">
    </div>
    <div class="form-group" style="margin:0;">
      <label class="form-label">その他控除（円/月）</label>
      <input class="form-input" type="number" id="sced-other-deduct" value="0" placeholder="0">
    </div>
  </div>
</div>
<div class="form-group">
  <label class="form-label">その他条件・備考</label>
  <textarea class="form-input" id="sced-note" rows="3">${sc.cond||''}</textarea>
</div>`,
  `<button class="btn btn-outline" onclick="closeModalDirect()">キャンセル</button>
   <button class="btn btn-primary" onclick="saveStaffCond('${name}')">保存</button>`
  );
}

function saveStaffCond(name) {
  const up = document.getElementById('sced-unitprice')?.value;
  const ff = document.getElementById('sced-fixed')?.value;
  const rf = document.getElementById('sced-rental')?.value;
  const od = document.getElementById('sced-other-deduct')?.value;
  staffCondOverrides[name] = {
    base: document.getElementById('sced-base')?.value || '',
    contract: document.getElementById('sced-contract')?.value || '',
    role: document.getElementById('sced-role')?.value || '',
    vehicle: document.getElementById('sced-vehicle')?.value || '',
    unitPrice: up ? Number(up) : null,
    fixedFee: ff ? Number(ff) : null,
    rentalFee: (Number(rf||0) + Number(od||0)),
    cond: document.getElementById('sced-note')?.value || '',
  };
  closeModalDirect();
  render();
}

function pageStaffConditions() {
  const bases = [...new Set(STAFF_CONDITIONS.map(s => s.base))].sort();
  const roles = [...new Set(STAFF_CONDITIONS.map(s => s.role))].sort();

  const filtered = STAFF_CONDITIONS.filter(s => {
    if (scFilterBase && s.base !== scFilterBase) return false;
    if (scFilterRole && s.role !== scFilterRole) return false;
    return true;
  });

  // Summary stats
  const totalUnit = filtered.filter(s => !s.fixedFee && s.unitPrice).length;
  const totalFixed = filtered.filter(s => s.fixedFee).length;
  const totalRental = filtered.filter(s => s.rentalFee > 0).length;

  const rows = filtered.map(s => {
    const sc = getStaffCond(s.name);
    const calc = staffPayCalc(sc, null); // dummy counts for preview
    const isFixed = calc.type === 'fixed';
    const hasOverride = !!staffCondOverrides[s.name];

    return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 10px;">
        <div style="font-weight:600;font-size:13px;">${s.name.replace(/（.*?）/g,'').trim()}${hasOverride ? '<span style="background:#fef9c3;color:#713f12;font-size:10px;border-radius:3px;padding:1px 5px;margin-left:4px;">編集済</span>' : ''}</div>
        <div style="font-size:11px;color:#64748b;">${s.contract}</div>
      </td>
      <td style="padding:8px 10px;font-size:13px;">${sc.base.replace('郵便局','')}</td>
      <td style="padding:8px 10px;">
        <span style="background:${sc.role==='リーダー'?'#fef3c7':'#eff6ff'};color:${sc.role==='リーダー'?'#92400e':'#1e40af'};border-radius:4px;padding:2px 8px;font-size:12px;">${sc.role}</span>
      </td>
      <td style="padding:8px 10px;text-align:right;font-size:13px;">
        ${isFixed
          ? `<span style="color:#7c3aed;font-weight:700;">固定 ¥${(sc.fixedFee||0).toLocaleString()}/月</span>`
          : `<span style="font-weight:700;">¥${(sc.unitPrice||0).toLocaleString()}</span><span style="color:#64748b;font-size:11px;">/件</span>`
        }
      </td>
      <td style="padding:8px 10px;text-align:right;font-size:13px;">
        ${sc.rentalFee > 0
          ? `<span style="color:#dc2626;">−¥${sc.rentalFee.toLocaleString()}</span>`
          : `<span style="color:#94a3b8;">−</span>`
        }
      </td>
      <td style="padding:8px 10px;text-align:center;">
        <span style="background:${sc.vehicle==='持込'?'#f0fdf4':'#fff7ed'};color:${sc.vehicle==='持込'?'#166534':'#c2410c'};border-radius:4px;padding:2px 8px;font-size:12px;">${sc.vehicle||'-'}</span>
      </td>
      <td style="padding:8px 10px;font-size:11px;color:#64748b;max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" title="${(sc.cond||'').replace(/"/g,'&quot;')}">${sc.cond||'—'}</td>
      <td style="padding:8px 10px;">
        <button class="btn btn-ghost btn-sm" onclick="openStaffCondEdit('${s.name.replace(/'/g,"\\'")}')">編集</button>
        <button class="btn btn-ghost btn-sm" onclick="showStaffPayDetail('${s.name.replace(/'/g,"\\'")}')">試算</button>
      </td>
    </tr>`;
  }).join('');

  return `
<div class="page-header">
  <div class="page-title">💴 スタッフ個別条件・支払設定</div>
</div>

<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
  <div style="background:#eff6ff;border-radius:10px;padding:14px;">
    <div style="font-size:12px;color:#1e40af;font-weight:600;margin-bottom:4px;">件数連動型</div>
    <div style="font-size:24px;font-weight:700;color:#1e40af;">${totalUnit}名</div>
    <div style="font-size:11px;color:#3b82f6;">単価×件数で支払い計算</div>
  </div>
  <div style="background:#f5f3ff;border-radius:10px;padding:14px;">
    <div style="font-size:12px;color:#7c3aed;font-weight:600;margin-bottom:4px;">固定費型</div>
    <div style="font-size:24px;font-weight:700;color:#7c3aed;">${totalFixed}名</div>
    <div style="font-size:11px;color:#8b5cf6;">月額固定で支払い計算</div>
  </div>
  <div style="background:#fff7ed;border-radius:10px;padding:14px;">
    <div style="font-size:12px;color:#c2410c;font-weight:600;margin-bottom:4px;">車両貸出控除あり</div>
    <div style="font-size:24px;font-weight:700;color:#c2410c;">${totalRental}名</div>
    <div style="font-size:11px;color:#f97316;">¥23,000〜¥25,000/月控除</div>
  </div>
</div>

<div class="filter-bar" style="margin-bottom:14px;">
  <div>
    <label class="form-label" style="font-size:11px;">拠点</label>
    <select class="form-select" style="width:180px;" onchange="scFilterBase=this.value;render();">
      <option value="">全拠点</option>
      ${bases.map(b => `<option value="${b}" ${scFilterBase===b?'selected':''}>${b}</option>`).join('')}
    </select>
  </div>
  <div>
    <label class="form-label" style="font-size:11px;">役割</label>
    <select class="form-select" style="width:140px;" onchange="scFilterRole=this.value;render();">
      <option value="">全役割</option>
      ${roles.map(r => `<option value="${r}" ${scFilterRole===r?'selected':''}>${r}</option>`).join('')}
    </select>
  </div>
  <div style="font-size:13px;color:#64748b;align-self:flex-end;">${filtered.length}名表示中</div>
</div>

<div class="card" style="overflow-x:auto;">
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
        <th style="padding:8px 10px;text-align:left;white-space:nowrap;">氏名</th>
        <th style="padding:8px 10px;text-align:left;white-space:nowrap;">拠点</th>
        <th style="padding:8px 10px;text-align:left;white-space:nowrap;">役割</th>
        <th style="padding:8px 10px;text-align:right;white-space:nowrap;">卸単価 / 固定費</th>
        <th style="padding:8px 10px;text-align:right;white-space:nowrap;">控除</th>
        <th style="padding:8px 10px;text-align:center;white-space:nowrap;">車両</th>
        <th style="padding:8px 10px;text-align:left;">その他条件</th>
        <th style="padding:8px 10px;"></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

function showStaffPayDetail(name) {
  const sc = getStaffCond(name);
  const isFixed = !!sc.fixedFee;

  const inputsHtml = isFixed ? `
<div style="background:#f5f3ff;border-radius:8px;padding:12px;margin-bottom:12px;">
  <div style="font-size:13px;font-weight:600;color:#7c3aed;margin-bottom:6px;">固定費型</div>
  <div style="display:flex;justify-content:space-between;font-size:14px;">
    <span>月額固定費</span><strong>¥${(sc.fixedFee||0).toLocaleString()}</strong>
  </div>
</div>` : `
<div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:12px;">
  <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px;">件数入力（試算用）</div>
  ${['配達完了①','配達完了②','転居大口等①','夜間配送','大配送','集荷①','集荷②','尋ねあたらず','その他事故'].map(item => `
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px;">
    <label style="width:110px;color:#64748b;">${item}</label>
    <input type="number" min="0" value="${['配達完了①'].includes(item)?100:0}" id="pay_${item.replace(/[①②]/g,m=>m==='①'?'1':'2')}"
      style="width:70px;border:1px solid #e2e8f0;border-radius:4px;padding:3px 6px;text-align:right;"
      oninput="updatePayCalc('${name}')">
    <span style="color:#94a3b8;font-size:11px;">件 × ¥${['配達完了①','配達完了②','転居大口等①','転居大口等②','尋ねあたらず','その他事故'].includes(item)?(sc.unitPrice||0):({'夜間配送':31,'大配送':72,'集荷①':80,'集荷②':80}[item]||0)}</span>
  </div>`).join('')}
</div>`;

  const calc = staffPayCalc(sc, null);

  openModal(`支払試算 — ${name.replace(/（.*?）/g,'').trim()}`, `
<div style="font-size:13px;color:#64748b;margin-bottom:10px;">
  ${sc.base} / ${sc.role} / ${sc.contract}
</div>
${inputsHtml}
<div id="pay-result" style="background:#eff6ff;border-radius:10px;padding:14px;">
  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
    <span style="font-size:13px;">売上合計</span>
    <strong id="pay-gross" style="font-size:14px;">¥${calc.gross.toLocaleString()}</strong>
  </div>
  ${sc.rentalFee>0?`<div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#dc2626;">
    <span style="font-size:13px;">車両貸出費用（控除）</span>
    <span id="pay-deduct" style="font-size:13px;">−¥${sc.rentalFee.toLocaleString()}</span>
  </div>`:''}
  ${sc.cond?`<div style="font-size:11px;color:#64748b;background:#fef9c3;border-radius:4px;padding:6px 8px;margin-bottom:8px;">📝 ${sc.cond.substring(0,100)}${sc.cond.length>100?'…':''}</div>`:''}
  <div style="border-top:2px solid #bfdbfe;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-weight:700;font-size:14px;">実支払額</span>
    <strong id="pay-net" style="font-size:22px;color:#1e40af;">¥${calc.net.toLocaleString()}</strong>
  </div>
</div>
<div style="font-size:11px;color:#94a3b8;margin-top:8px;">※ 試算値。実際の支払額は件数確定後に確定します。</div>`,
  `<button class="btn btn-outline" onclick="closeModalDirect()">閉じる</button>
   <button class="btn btn-primary" onclick="openStaffCondEdit('${name.replace(/'/g,"\\'")}')">条件編集</button>`
  );

  // Set up live calc after modal renders
  if (!isFixed) {
    window._payCalcName = name;
    window._payCalcSc = sc;
  }
}

function updatePayCalc(name) {
  const sc = window._payCalcSc || getStaffCond(name);
  const itemMap = {'配達完了1':'配達完了①','配達完了2':'配達完了②','転居大口等1':'転居大口等①','転居大口等2':'転居大口等②','夜間配送':'夜間配送','大配送':'大配送','集荷1':'集荷①','集荷2':'集荷②','尋ねあたらず':'尋ねあたらず','その他事故':'その他事故'};
  const counts = {};
  for (const [id, item] of Object.entries(itemMap)) {
    const el = document.getElementById('pay_' + id);
    counts[item] = el ? Number(el.value) || 0 : 0;
  }
  const calc = staffPayCalc(sc, counts);
  const gEl = document.getElementById('pay-gross');
  const nEl = document.getElementById('pay-net');
  const dEl = document.getElementById('pay-deduct');
  if (gEl) gEl.textContent = '¥' + calc.gross.toLocaleString();
  if (nEl) nEl.textContent = '¥' + calc.net.toLocaleString();
  if (dEl) dEl.textContent = '−¥' + calc.deduct.toLocaleString();
}
