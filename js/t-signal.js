let tSignalTimer = null;
function stopTRefresh() { if (tSignalTimer) { clearInterval(tSignalTimer); tSignalTimer = null; } }

async function renderTSignal(el) {
  if (!el) return;
  stopTRefresh();
  let list = getWatchlist();
  list = list.filter(s => s && s.code && s.name);
  el.innerHTML = `<div class="card"><div class="card-title">⚡ 自选股实时信号 & 做T机会</div>
    <div style="text-align:center;padding:20px;color:#58a6ff">加载中...</div></div>`;
  if (!list.length) {
    el.innerHTML = `<div class="card"><div class="card-title">⚡ 自选股实时信号 & 做T机会</div><p style="color:#8b949e;padding:20px">暂无自选股，请先在自选股页添加</p></div>`;
    return;
  }
  const [marketCtx, quotesMap] = await Promise.all([
    getMarketContext().catch(() => ({level:'unknown',desc:'大盘数据加载失败',color:'#8b949e',shPct:0,szPct:0,cybPct:0,avgPct:'0.00'})),
    fetchAStockQuotesBatch(list.map(s => s.code)).catch(() => ({}))
  ]);
  const capResults = {};
  for (const s of list) {
    try {
      const capFlow = await fetchEMCapitalFlow(s.code);
      if (capFlow && capFlow.length) capResults[s.code] = capFlow[capFlow.length - 1].main;
    } catch(e) {}
    await new Promise(r => setTimeout(r, 150));
  }
  el.innerHTML = renderTSignalTable(list, quotesMap, capResults, marketCtx);
  tSignalTimer = setInterval(async () => {
    const qm = await fetchAStockQuotesBatch(list.map(s => s.code)).catch(() => ({}));
    for (const s of list) {
      if (qm[s.code]) quotesMap[s.code] = qm[s.code];
    }
    const tableCard = document.getElementById('tsignalTable');
    if (tableCard) tableCard.innerHTML = renderTSignalTable(list, quotesMap, capResults, marketCtx).match(/<div id="tsignalTable">([\s\S]*)<\/div>/)?.[1] || '';
  }, 60000);
}

// 手动刷新做T信号
async function manualRefreshTSignal() {
  const el = document.getElementById('mainContent');
  if (!el) return;
  const btn = document.getElementById('tsignalRefreshBtn');
  if (btn) { btn.disabled = true; btn.textContent = '刷新中...'; }
  await renderTSignal(el);
  if (btn) { btn.disabled = false; btn.textContent = '🔄 手动刷新'; }
}

function renderTSignalTable(list, quotesMap, capResults, marketCtx) {
  const rows = list.map(s => {
    const q = quotesMap[s.code] || {};
    const price = q.price || s.price || '—';
    const pct = q.pct !== undefined ? parseFloat(q.pct) : 0;
    const pctCls = pct >= 0 ? 'up' : 'down';
    const high = q.high || 0;
    const low = q.low || 0;
    const amplitude = high && low ? ((high - low) / (parseFloat(q.prevClose || price) || 1) * 100).toFixed(1) : '—';
    const mainFlow = capResults[s.code] !== undefined ? capResults[s.code] : null;
    const signal = calcTSignal(pct, mainFlow, amplitude, marketCtx);
    const sigCls = signal.action === '正T买入' ? 'up' : signal.action === '反T卖出' ? 'down' : 'flat';
    return `<tr>
      <td><b style="color:#58a6ff">${s.name}</b><br><span style="font-size:10px;color:#8b949e">${s.code}</span></td>
      <td style="font-weight:bold">${price}</td>
      <td class="${pctCls}" style="font-weight:bold">${pct ? (pct>=0?'+':'')+pct+'%' : '—'}</td>
      <td style="font-size:12px">${amplitude}%</td>
      <td class="${mainFlow !== null && mainFlow >= 0 ? 'up' : 'down'}" style="font-weight:bold">${mainFlow !== null ? (mainFlow>=0?'+':'')+mainFlow.toFixed(2)+'亿' : '加载中'}</td>
      <td class="${sigCls}" style="font-weight:bold;font-size:14px">${signal.action}</td>
      <td style="font-size:12px">${signal.reason}</td>
      <td style="font-size:12px"><span style="color:${signal.color}">${signal.confidence}</span></td>
    </tr>`;
  }).join('');

  const buyCount = list.filter(s => calcTSignal((quotesMap[s.code]||{}).pct||0, capResults[s.code], 0, marketCtx).action === '正T买入').length;
  const sellCount = list.filter(s => calcTSignal((quotesMap[s.code]||{}).pct||0, capResults[s.code], 0, marketCtx).action === '反T卖出').length;

  return `<div class="card">
    <div class="card-title">⚡ 自选股实时信号 & 做T机会</div>
    <div style="padding:8px 12px;background:#0d1117;border-radius:6px;margin-bottom:12px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <span style="color:${marketCtx.color};font-weight:700">大盘：${marketCtx.desc}</span>
      <span style="font-size:12px;color:#8b949e">上证 ${marketCtx.shPct>0?'+':''}${marketCtx.shPct}%</span>
      <span style="background:#3fb95022;color:#3fb950;padding:2px 8px;border-radius:4px;font-size:12px">正T机会 ${buyCount} 只</span>
      <span style="background:#ea394322;color:#ea3943;padding:2px 8px;border-radius:4px;font-size:12px">反T机会 ${sellCount} 只</span>
      <span style="font-size:11px;color:#8b949e">⏱ 每60秒自动刷新</span>
      <button class="btn btn-sm" id="tsignalRefreshBtn" style="background:#1f6feb;color:#fff;font-size:11px" onclick="manualRefreshTSignal()">🔄 手动刷新</button>
    </div>
    <div id="tsignalTable" style="overflow-x:auto"><table class="data-table" style="font-size:13px">
      <tr><th>股票</th><th>现价</th><th>涨跌%</th><th>振幅</th><th>主力资金</th><th>做T信号</th><th>策略说明</th><th>置信度</th></tr>
      ${rows}
    </table></div>
    <div style="margin-top:10px;font-size:11px;color:#8b949e;display:flex;flex-wrap:wrap;gap:6px">
      <span style="color:#3fb950">🟢 正T=先买后卖</span>
      <span style="color:#ea3943">🔴 反T=先卖后买</span>
      <span style="color:#8b949e">⚪ 观望=暂不做T</span>
      <span style="margin-left:auto">做T需持有底仓，T+1制度下当天买入不可卖出</span>
    </div>
  </div>`;
}

function calcTSignal(pct, mainFlow, amplitude, marketCtx) {
  const marketLv = marketCtx.level || 'neutral';
  if (pct <= -3 && mainFlow !== null && mainFlow > 0) {
    return {action:'正T买入', reason:'大跌'+pct.toFixed(1)+'%但主力逆势流入，低吸良机', color:'#3fb950', confidence:'高'};
  }
  if (pct <= -2 && mainFlow !== null && mainFlow > 0.3) {
    return {action:'正T买入', reason:'下跌'+pct.toFixed(1)+'%+主力净流入，短线超跌', color:'#16c784', confidence:'中'};
  }
  if (pct <= -4 && (marketLv === 'strong' || marketLv === 'mid-up')) {
    return {action:'正T买入', reason:'强势市场中的非理性下跌，可低吸', color:'#3fb950', confidence:'高'};
  }
  if (pct <= -2 && parseFloat(amplitude) > 4) {
    return {action:'正T买入', reason:'大幅震荡后下跌，有反弹预期', color:'#16c784', confidence:'中'};
  }
  if (pct >= 3 && mainFlow !== null && mainFlow < -0.3) {
    return {action:'反T卖出', reason:'大涨'+pct.toFixed(1)+'%但主力流出，高抛锁定利润', color:'#ea3943', confidence:'高'};
  }
  if (pct >= 2 && mainFlow !== null && mainFlow < 0) {
    return {action:'反T卖出', reason:'上涨乏力+主力转流出，先卖后买', color:'#f0883e', confidence:'中'};
  }
  if (pct >= 5) {
    return {action:'反T卖出', reason:'大涨'+pct.toFixed(1)+'%短线超买，适当高抛', color:'#ea3943', confidence:'高'};
  }
  if (pct >= 3 && marketLv === 'bad') {
    return {action:'反T卖出', reason:'弱势市场中的逆势拉升，警惕诱多', color:'#f0883e', confidence:'中'};
  }
  if (pct <= -1.5 && pct > -3 && mainFlow !== null && mainFlow > 0.1) {
    return {action:'关注正T', reason:'小跌+资金流入，等待进一步下跌后介入', color:'#58a6ff', confidence:'低'};
  }
  if (pct >= 1.5 && pct < 3 && mainFlow !== null && mainFlow < -0.1) {
    return {action:'关注反T', reason:'小涨+资金流出，准备高抛', color:'#d29922', confidence:'低'};
  }
  if (Math.abs(pct) < 0.5 && mainFlow !== null && Math.abs(mainFlow) < 0.1) {
    return {action:'观望', reason:'横盘震荡，方向不明，等待信号', color:'#8b949e', confidence:'—'};
  }
  if (pct < 0 && mainFlow !== null && mainFlow < -0.5) {
    return {action:'观望', reason:'下跌放量+主力大幅流出，不宜抄底', color:'#8b949e', confidence:'—'};
  }
  return {action:'观望', reason: pct < 0 ? '弱势下跌，等待企稳' : '小幅上涨，持股不动', color:'#8b949e', confidence:'—'};
}
