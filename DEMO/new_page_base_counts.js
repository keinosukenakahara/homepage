function pageBaseCounts(){
  // 利用可能な日付を集める
  const allDays = new Set();
  for(const bn of BASE_ORDER2){
    const bd = BASE_FULL_DATA[bn];
    if(!bd) continue;
    for(const s of (bd.staff||[])){
      for(const d of Object.keys(s.daily||{})) allDays.add(d);
    }
  }
  const sortedDays = [...allDays].map(Number).sort((a,b)=>a-b).map(String);
  if(!baseCountsDay || !allDays.has(baseCountsDay)) baseCountsDay = sortedDays[sortedDays.length-1]||'1';
  const day = baseCountsDay;

  // アイテム定義
  function getItemsForBase(bn){
    if(bn==='宇品郵便局') return ['配達完了①','配達完了②','転居大口等①','転居大口等②','夜間配送','大配送','集荷①','集荷②','尋ねあたらず','その他事故'];
    return ['配達完了①','転居大口等①','夜間配送','大配送','集荷①','集荷②','尋ねあたらず','その他事故'];
  }

  // adminInputsキー
  function aKey(bn,name,item){ return `${bn}__${name}__${item}`; }

  // 拠点カード生成
  let baseCards='';
  let grandClientTotal=0;

  // 全拠点サマリー用
  const summaryRows=[];

  for(const bn of BASE_ORDER2){
    const bd = BASE_FULL_DATA[bn];
    const prices = UNIT_PRICES[bn]||{};
    const clientPrices = prices.client||{};
    const staffPrices = prices.staff||{};
    const items = getItemsForBase(bn);

    // スタッフデータ収集
    const staffList = (bd?.staff||[]);
    // 各スタッフの当日件数
    const staffDayData = staffList.map(s=>{
      const dayData = (s.daily||{})[day]||{};
      return {name:s.name, data:dayData};
    }).filter(s=>s.name);

    // 拠点合計
    const baseTotals={};
    for(const item of items) baseTotals[item]=0;

    // スタッフ行HTML
    let staffRows='';
    let baseClientAmt=0;

    for(const sd of staffDayData){
      let staffPayAmt=0;
      let cells='';
      for(const item of items){
        const staffVal = sd.data[item];
        const hasStaffInput = (staffVal!==undefined && staffVal!==null && staffVal!=='');
        const adminVal = adminInputs[aKey(bn,sd.name,item)];
        let qty = hasStaffInput ? Number(staffVal) : (adminVal!==undefined ? Number(adminVal) : 0);
        baseTotals[item] = (baseTotals[item]||0) + qty;

        // 卸単価
        const sprice = staffPrices[item]||0;
        staffPayAmt += qty * sprice;

        let cellHtml;
        if(hasStaffInput){
          cellHtml=`<td style="text-align:center;padding:4px 6px;">
            <span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:4px;padding:2px 8px;font-size:13px;font-weight:600;">${qty}</span>
            <span style="display:block;font-size:10px;color:#16a34a;">✓入力済</span>
          </td>`;
        } else {
          const aval = adminVal!==undefined ? adminVal : '';
          cellHtml=`<td style="text-align:center;padding:4px 6px;">
            <input type="number" min="0" value="${aval}" placeholder="0"
              style="width:60px;padding:2px 4px;border:1px solid #f97316;border-radius:4px;text-align:center;font-size:13px;"
              onchange="adminInputs['${aKey(bn,sd.name,item)}']=this.value; render();">
            <span style="display:block;font-size:10px;color:#f97316;">管理入力</span>
          </td>`;
        }
        cells+=cellHtml;
      }
      // 支払い金額セル
      const payCell=`<td style="text-align:right;padding:4px 8px;font-weight:600;color:#7c3aed;white-space:nowrap;">¥${Math.round(staffPayAmt).toLocaleString()}</td>`;
      staffRows+=`<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:4px 8px;white-space:nowrap;font-size:13px;">${sd.name}</td>
        ${cells}${payCell}
      </tr>`;
    }

    // 拠点合計行 & 請求金額
    let totalCells='';
    let baseTotalPay=0;
    for(const item of items){
      const qty = baseTotals[item]||0;
      const cprice = clientPrices[item]||0;
      const amt = qty * cprice;
      baseClientAmt += amt;
      totalCells+=`<td style="text-align:center;padding:4px 6px;font-weight:700;background:#f9fafb;">${qty}</td>`;
    }
    grandClientTotal += baseClientAmt;

    // サマリー用データ
    summaryRows.push({bn, baseClientAmt, baseTotals, items, clientPrices});

    const itemHeaders = items.map(it=>`<th style="padding:4px 6px;min-width:70px;text-align:center;font-size:12px;white-space:nowrap;">${it}</th>`).join('');
    const priceHeaders = items.map(it=>{
      const cp=clientPrices[it]||0;
      return `<th style="padding:2px 6px;text-align:center;font-size:11px;color:#6b7280;white-space:nowrap;">${cp?'¥'+cp:'-'}</th>`;
    }).join('');

    const isExpanded = expandedBases.has(bn);
    baseCards+=`
<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:16px;overflow:hidden;">
  <div onclick="if(expandedBases.has('${bn}'))expandedBases.delete('${bn}');else expandedBases.add('${bn}');render();"
       style="padding:14px 18px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:2px solid #e2e8f0;">
    <div>
      <span style="font-weight:700;font-size:16px;">${bn}</span>
      <span style="margin-left:12px;font-size:13px;color:#6b7280;">${staffDayData.length}名</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px;">
      <span style="font-size:15px;font-weight:700;color:#1e40af;">請求合計: ¥${Math.round(baseClientAmt).toLocaleString()}</span>
      <span style="font-size:18px;">${isExpanded?'▲':'▼'}</span>
    </div>
  </div>
  ${isExpanded?`
  <div style="overflow-x:auto;padding:12px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#eff6ff;">
          <th style="padding:6px 8px;text-align:left;min-width:80px;">スタッフ名</th>
          ${itemHeaders}
          <th style="padding:6px 8px;text-align:right;min-width:80px;">支払金額</th>
        </tr>
        <tr style="background:#f9fafb;">
          <th style="padding:2px 8px;font-size:11px;color:#6b7280;">受単価</th>
          ${priceHeaders}
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${staffRows}
        <tr style="background:#eff6ff;font-weight:700;">
          <td style="padding:6px 8px;">拠点合計</td>
          ${totalCells}
          <td style="text-align:right;padding:6px 8px;color:#1e40af;">¥${Math.round(baseClientAmt).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top:8px;padding:10px 14px;background:#fefce8;border-radius:8px;font-size:13px;">
      <strong>クライアント請求金額：</strong>
      ${items.map(it=>{
        const qty=baseTotals[it]||0;
        const cp=clientPrices[it]||0;
        if(!qty && !cp) return '';
        return `<span style="margin-right:12px;">${it}: ${qty}件 × ¥${cp} = ¥${Math.round(qty*cp).toLocaleString()}</span>`;
      }).filter(Boolean).join('')}
      <span style="float:right;font-weight:700;color:#1e40af;font-size:15px;">合計 ¥${Math.round(baseClientAmt).toLocaleString()}</span>
    </div>
  </div>`:``}
</div>`;
  }

  // 全拠点サマリーテーブル
  let summaryHtml=`
<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:24px;overflow:hidden;">
  <div style="padding:14px 18px;background:#1e40af;color:#fff;">
    <strong style="font-size:16px;">📊 全拠点請求サマリー（${day}日）</strong>
    <span style="float:right;font-size:18px;font-weight:700;">合計 ¥${Math.round(grandClientTotal).toLocaleString()}</span>
  </div>
  <div style="padding:16px;overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#eff6ff;">
        <th style="padding:6px 10px;text-align:left;">拠点</th>
        <th style="padding:6px 10px;text-align:right;">配達完了①</th>
        <th style="padding:6px 10px;text-align:right;">配達完了②</th>
        <th style="padding:6px 10px;text-align:right;">転居等</th>
        <th style="padding:6px 10px;text-align:right;">夜間</th>
        <th style="padding:6px 10px;text-align:right;">大配送</th>
        <th style="padding:6px 10px;text-align:right;">集荷</th>
        <th style="padding:6px 10px;text-align:right;">事故等</th>
        <th style="padding:6px 10px;text-align:right;color:#1e40af;">請求金額</th>
      </tr></thead>
      <tbody>`;
  for(const {bn,baseClientAmt,baseTotals,items,clientPrices} of summaryRows){
    const c1=baseTotals['配達完了①']||0;
    const c2=baseTotals['配達完了②']||0;
    const ten=(baseTotals['転居大口等①']||0)+(baseTotals['転居大口等②']||0);
    const yakan=baseTotals['夜間配送']||0;
    const dai=baseTotals['大配送']||0;
    const shu=(baseTotals['集荷①']||0)+(baseTotals['集荷②']||0);
    const jiko=(baseTotals['尋ねあたらず']||0)+(baseTotals['その他事故']||0);
    summaryHtml+=`<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:6px 10px;font-weight:600;">${bn.replace('郵便局','')}</td>
      <td style="padding:6px 10px;text-align:right;">${c1}</td>
      <td style="padding:6px 10px;text-align:right;">${c2||'-'}</td>
      <td style="padding:6px 10px;text-align:right;">${ten}</td>
      <td style="padding:6px 10px;text-align:right;">${yakan}</td>
      <td style="padding:6px 10px;text-align:right;">${dai}</td>
      <td style="padding:6px 10px;text-align:right;">${shu}</td>
      <td style="padding:6px 10px;text-align:right;">${jiko}</td>
      <td style="padding:6px 10px;text-align:right;font-weight:700;color:#1e40af;">¥${Math.round(baseClientAmt).toLocaleString()}</td>
    </tr>`;
  }
  summaryHtml+=`<tr style="background:#eff6ff;font-weight:700;">
    <td style="padding:6px 10px;">合計</td>
    <td colspan="7"></td>
    <td style="padding:6px 10px;text-align:right;color:#1e40af;font-size:15px;">¥${Math.round(grandClientTotal).toLocaleString()}</td>
  </tr></tbody></table>
  </div>
</div>`;

  const dayBtns = sortedDays.map(d=>`<button onclick="baseCountsDay='${d}';render();"
    style="padding:6px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:14px;
    background:${d===day?'#1e40af':'#e2e8f0'};color:${d===day?'#fff':'#374151'};">${d}日</button>`).join('');

  document.getElementById('main-content').innerHTML=`
<div style="padding:20px;max-width:1200px;margin:0 auto;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
    <h2 style="font-size:22px;font-weight:800;color:#1e293b;margin:0;">📦 拠点別件数管理</h2>
    <div style="font-size:12px;color:#6b7280;">
      <span style="background:#dcfce7;color:#166534;border-radius:4px;padding:2px 8px;margin-right:8px;">✓入力済 = スタッフ端末から自動反映</span>
      <span style="background:#fff7ed;color:#f97316;border-radius:4px;padding:2px 8px;">管理入力 = 管理者が手入力</span>
    </div>
  </div>
  <div style="margin-bottom:20px;">
    <span style="font-weight:600;margin-right:10px;">📅 日付選択：</span>
    <div style="display:inline-flex;gap:8px;flex-wrap:wrap;">${dayBtns}</div>
  </div>
  ${summaryHtml}
  <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#374151;">拠点別詳細（クリックで展開）</h3>
  ${baseCards}
</div>`;
}
