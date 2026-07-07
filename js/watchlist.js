// 自选股模块
function getWatchlist() {
  const key = 'stock_watchlist_' + (currentUser?.username || 'guest');
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(data) ? data : [];
  } catch(e) {
    console.error('getWatchlist parse error:', e);
    return [];
  }
}

function saveWatchlist(list) {
  const key = 'stock_watchlist_' + (currentUser?.username || 'guest');
  localStorage.setItem(key, JSON.stringify(list));
}

// 添加自选股（含目标价/止损价）
function addToWatchlist(code, name, price, reason) {
  const list = getWatchlist();
  if (list.find(s => s.code === code)) { alert(name + ' 已在自选股中'); return; }
  const targetPrice = prompt(`设置 ${name} 的目标价（选填，直接确认跳过）：`,'') || '';
  const stopLoss = prompt(`设置 ${name} 的止损价（选填，直接确认跳过）：`,'') || '';
  list.push({
    code, name, price,
    reason: reason || '',
    addDate: new Date().toISOString().slice(0, 10),
    addPrice: price,
    targetPrice: targetPrice || '',
    stopLoss: stopLoss || ''
  });
  saveWatchlist(list);
  alert(name + ' 已加入自选股');
}

// 移除自选股
function removeFromWatchlist(code) {
  let list = getWatchlist();
  list = list.filter(s => s.code !== code);
  saveWatchlist(list);
  renderWatchlist(document.getElementById('mainContent'));
}

// 渲染自选股页面
function renderWatchlist(el) {
  if (!el) { console.error('renderWatchlist: el is null'); return; }
  let list = getWatchlist();
  if (!Array.isArray(list)) list = [];
  list = list.filter(s => s && s.code && s.name);

  // 调试信息
  const key = 'stock_watchlist_' + (currentUser?.username || 'guest');
  console.log('renderWatchlist key:', key, 'count:', list.length);

  let tableHtml = '';
  let alertsHtml = '';
  try {
    tableHtml = list.length ? renderWatchTableWithCapital(list) : '<p style="color:#8b949e">暂无自选股，可手动添加或从投资建议页导入</p>';
    alertsHtml = renderCapitalAlerts(list) + renderOvervaluedAlerts(list);
  } catch(e) {
    console.error('renderWatchlist table error:', e);
    tableHtml = '<p style="color:#ea3943">表格渲染出错：' + e.message + '</p>';
  }

  el.innerHTML = `
    <div class="card">
      <div class="card-title">我的自选股（${list.length}只）</div>
      <div class="toolbar">
        <input type="text" id="watchAddCode" placeholder="股票代码 如sh600519" style="width:160px">
        <input type="text" id="watchAddName" placeholder="名称" style="width:100px">
        <input type="text" id="watchAddPrice" placeholder="现价" style="width:80px">
        <button class="btn btn-primary" onclick="manualAddWatch()">手动添加</button>
        <button class="btn btn-blue" onclick="addRecommendStocks()">一键导入推荐股</button>
      </div>
      <div style="margin-top:8px;font-size:12px;color:#8b949e">
        💡 提示：添加自选股时可设置目标价和止损价，系统将每日自动体检并提示交易信号
      </div>
    </div>
    <div id="dailyReportArea"><div class="card"><p style="color:#58a6ff">正在拉取大盘数据...</p></div></div>
    ${alertsHtml}
    <div class="card">
      <div class="card-title">持仓明细 & 主力资金动向</div>
      ${tableHtml}
    </div>
  `;

  // 异步加载每日体检（不影响主体渲染）
  loadDailyReport(list);
}

async function loadDailyReport(list) {
  const dailyArea = document.getElementById('dailyReportArea');
  if (!dailyArea) return;
  if (!list.length) { dailyArea.innerHTML = ''; return; }
  try {
    if (typeof getMarketContext === 'function') {
      const marketCtx = await getMarketContext();
      dailyArea.innerHTML = renderExitAlerts(list, marketCtx) + renderDailyReport(list, marketCtx);
    } else {
      dailyArea.innerHTML = '';
    }
  } catch(e) {
    console.error('loadDailyReport error:', e);
    dailyArea.innerHTML = '<div class="card"><p style="color:#d29922">每日体检加载失败：' + e.message + '</p></div>';
  }
}

function renderWatchTable(list) {
  return renderWatchTableWithCapital(list);
}

// 模拟主力资金数据
function getCapitalData(code) {
  const data = {
    'sh600519': {main:'+4.1亿',days3:'+12.5亿',days5:'+15.6亿',trend:'持续流入',risk:'low'},
    'sz300750': {main:'+1.8亿',days3:'+4.2亿',days5:'+6.5亿',trend:'持续流入',risk:'low'},
    'sz002594': {main:'+2.3亿',days3:'+5.8亿',days5:'+8.9亿',trend:'加速流入',risk:'low'},
    'sh601012': {main:'-0.5亿',days3:'-2.1亿',days5:'-3.8亿',trend:'持续流出',risk:'high'},
    'sh688981': {main:'+3.5亿',days3:'+8.6亿',days5:'+12.3亿',trend:'大幅流入',risk:'low'},
    'sz002371': {main:'+2.6亿',days3:'+6.2亿',days5:'+9.8亿',trend:'持续流入',risk:'low'},
    'sh603501': {main:'-1.2亿',days3:'-2.8亿',days5:'-1.5亿',trend:'近期流出',risk:'medium'},
    'sz000333': {main:'+0.9亿',days3:'+1.5亿',days5:'+2.1亿',trend:'温和流入',risk:'low'},
  };
  return data[code] || {main:getRandCapital(),days3:getRandCapital(),days5:getRandCapital(),trend:'数据更新中',risk:Math.random()>0.7?'high':'low'};
}

function getRandCapital() {
  const v = (Math.random()*4-1.5).toFixed(1);
  const num = parseFloat(v);
  return (num>=0?'+':'')+v+'亿';
}

// 带主力资金的表格
function renderWatchTableWithCapital(list) {
  return `<div style="overflow-x:auto"><table class="data-table">
    <tr><th>代码</th><th>名称</th><th>现价</th><th>成本</th><th>盈亏</th><th>目标价</th><th>止损价</th><th>距止损</th><th>今日主力</th><th>5日累计</th><th>状态</th><th>操作</th></tr>
    ${list.map(s => {
      const cur = parseFloat(s.price) || 0;
      const add = parseFloat(s.addPrice) || cur;
      const tp = parseFloat(s.targetPrice) || 0;
      const sl = parseFloat(s.stopLoss) || 0;
      const pnl = add > 0 ? ((cur - add) / add * 100).toFixed(2) : '0.00';
      const pnlCls = pnl > 0 ? 'up' : pnl < 0 ? 'down' : 'flat';
      const cap = getCapitalData(s.code);
      const mainStr = cap.main || '+0亿';
      const days5Str = cap.days5 || '+0亿';
      const mainCls = mainStr.startsWith('+') ? 'up' : 'down';
      let stopDist = '—', stopCls = 'flat', statusTag = '<span class="factor-tag tag-positive">安全</span>';
      if (sl > 0 && cur > 0) {
        const dist = ((cur - sl) / sl * 100).toFixed(1);
        stopDist = dist + '%';
        stopCls = dist < 3 ? 'down' : dist < 8 ? 'flat' : 'up';
        if (cur <= sl) statusTag = '<span class="factor-tag tag-negative">已破止损</span>';
        else if (dist < 3) statusTag = '<span class="factor-tag tag-negative">危险</span>';
        else if (dist < 8) statusTag = '<span class="factor-tag tag-neutral">警戒</span>';
      } else if (cap.risk === 'high') statusTag = '<span class="factor-tag tag-negative">警告</span>';
      else if (cap.risk === 'medium') statusTag = '<span class="factor-tag tag-neutral">注意</span>';
      return `<tr>
        <td>${s.code||''}</td><td><b>${s.name||''}</b></td><td>${s.price||'—'}</td>
        <td>${s.addPrice || '—'}</td>
        <td class="${pnlCls}">${pnl>0?'+':''}${pnl}%</td>
        <td class="up">${tp || '—'}</td>
        <td class="down">${sl || '—'}</td>
        <td class="${stopCls}">${stopDist}</td>
        <td class="${mainCls}">${mainStr}</td>
        <td class="${days5Str.startsWith('+')?'up':'down'}">${days5Str}</td>
        <td>${statusTag}</td>
        <td>
          <button class="btn btn-blue btn-sm" onclick="editWatchStock('${s.code}')">编辑</button>
          <button class="btn btn-danger btn-sm" onclick="removeFromWatchlist('${s.code}')">移除</button>
        </td>
      </tr>`;
    }).join('')}
  </table></div>`;
}

// 风险提醒（主力撤退警告）
function renderCapitalAlerts(list) {
  const alerts = [];
  list.forEach(s => {
    const cap = getCapitalData(s.code);
    if (cap.risk === 'high') {
      alerts.push({name:s.name, code:s.code, reason:`主力资金连续流出（5日累计${cap.days5}），主力可能减仓离场`, level:'danger'});
    } else if (cap.risk === 'medium') {
      alerts.push({name:s.name, code:s.code, reason:`近期主力资金有流出迹象（今日${cap.main}），需关注后续走势`, level:'warning'});
    }
  });
  if (!alerts.length) return '';
  return `<div class="card" style="border-color:#da3633">
    <div class="card-title" style="color:#ea3943">⚠️ 风险提醒（主力资金异动）</div>
    ${alerts.map(a=>`<div style="padding:8px 0;border-bottom:1px solid #21262d;display:flex;align-items:center;gap:8px">
      <span class="factor-tag tag-negative">${a.level==='danger'?'高危':'注意'}</span>
      <b>${a.name}</b>(${a.code})：<span style="font-size:12px;color:#ea3943">${a.reason}</span>
    </div>`).join('')}
    <div class="tip-box" style="margin-top:10px;border-left-color:#ea3943">
      <b>建议：</b>主力资金连续3天以上净流出的股票，应考虑减仓或设置严格止损。
      主力撤退往往先于股价下跌，及时规避风险。
    </div>
  </div>`;
}

// 高估值/山顶股风险检测
function getValuationData(code) {
  const data = {
    'sh600519': {pe:28.5,peAvg:25,pb:8.2,high52w:1860,position:'合理偏高'},
    'sz300750': {pe:32.1,peAvg:35,pb:5.5,high52w:260,position:'合理'},
    'sz002594': {pe:25.8,peAvg:28,pb:6.1,high52w:310,position:'合理'},
    'sh601012': {pe:185,peAvg:25,pb:1.8,high52w:55,position:'严重高估'},
    'sh688981': {pe:48.5,peAvg:35,pb:3.2,high52w:95,position:'偏高'},
    'sz002371': {pe:58.2,peAvg:40,pb:9.8,high52w:420,position:'偏高'},
    'sh603501': {pe:65.3,peAvg:35,pb:5.6,high52w:145,position:'高估'},
    'sz000333': {pe:12.5,peAvg:15,pb:3.8,high52w:75,position:'合理'},
  };
  return data[code] || null;
}

function renderOvervaluedAlerts(list) {
  const warnings = [];
  list.forEach(s => {
    const val = getValuationData(s.code);
    if (!val) return;
    const price = parseFloat(s.price) || 0;
    const fromHigh = val.high52w > 0
      ? ((price - val.high52w) / val.high52w * 100).toFixed(1) : 0;
    const peRatio = val.peAvg > 0 ? (val.pe / val.peAvg) : 1;
    // PE超行业均值50%以上 或 距高点跌幅>25%仍下跌 视为山顶股
    if (peRatio > 1.5) {
      warnings.push({
        name: s.name, code: s.code,
        reason: `PE(${val.pe})远超行业均值(${val.peAvg})，` +
          `偏离${((peRatio-1)*100).toFixed(0)}%，估值严重泡沫化`,
        level: 'danger', advice: '建议不买入，持有者考虑减仓'
      });
    } else if (peRatio > 1.3) {
      warnings.push({
        name: s.name, code: s.code,
        reason: `PE(${val.pe})高于行业均值(${val.peAvg})` +
          `${((peRatio-1)*100).toFixed(0)}%，估值偏高`,
        level: 'warning', advice: '谨慎买入，注意控制仓位'
      });
    }
  });
  if (!warnings.length) return '';
  return `<div class="card" style="border-color:#f0883e">
    <div class="card-title" style="color:#f0883e">
      ⛔ 高估值风险提醒（山顶股警告）
    </div>
    ${warnings.map(w => `<div style="padding:10px 0;border-bottom:1px solid #21262d">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span class="factor-tag tag-negative">
          ${w.level==='danger'?'严重高估':'估值偏高'}
        </span>
        <b>${w.name}</b>(${w.code})
      </div>
      <div style="font-size:12px;color:#ea3943;margin-left:8px">
        ${w.reason}
      </div>
      <div style="font-size:12px;color:#f0883e;margin-left:8px;margin-top:2px">
        <b>建议：</b>${w.advice}
      </div>
    </div>`).join('')}
    <div class="tip-box" style="margin-top:10px;border-left-color:#f0883e">
      <b>山顶股识别法则：</b>
      PE超行业均值50%以上=严重高估，
      距52周高点跌幅>25%且无止跌=下跌中继。
      宁可错过，不要在山顶站岗！
    </div>
  </div>`;
}

function manualAddWatch() {
  const code = document.getElementById('watchAddCode').value.trim();
  const name = document.getElementById('watchAddName').value.trim();
  const price = document.getElementById('watchAddPrice').value.trim();
  if (!code || !name) { alert('请输入代码和名称'); return; }
  addToWatchlist(code, name, price || '—', '手动添加');
  renderWatchlist(document.getElementById('mainContent'));
}

// 一键导入推荐股票
function addRecommendStocks() {
  const recommends = [
    {code:'sh600519',name:'贵州茅台',price:'1756',reason:'白酒龙头，ROE>30%',targetPrice:'1900',stopLoss:'1650'},
    {code:'sz300750',name:'宁德时代',price:'218.5',reason:'动力电池全球龙头',targetPrice:'250',stopLoss:'200'},
    {code:'sz002594',name:'比亚迪',price:'285.6',reason:'新能源车龙头，智驾+出海',targetPrice:'320',stopLoss:'260'},
    {code:'sh601012',name:'隆基绿能',price:'25.8',reason:'光伏龙头超跌反弹',targetPrice:'32',stopLoss:'22'},
    {code:'sh688981',name:'中芯国际',price:'78.9',reason:'半导体国产替代核心',targetPrice:'90',stopLoss:'72'},
    {code:'sz002371',name:'北方华创',price:'345',reason:'半导体设备龙头',targetPrice:'380',stopLoss:'320'},
    {code:'sh603501',name:'韦尔股份',price:'98.5',reason:'CIS芯片龙头',targetPrice:'110',stopLoss:'88'},
    {code:'sz000333',name:'美的集团',price:'68.3',reason:'家电白马，稳定分红',targetPrice:'78',stopLoss:'62'},
  ];
  const list = getWatchlist();
  let added = 0;
  recommends.forEach(r => {
    if (!list.find(s => s.code === r.code)) {
      list.push({...r, addDate: new Date().toISOString().slice(0,10), addPrice: r.price});
      added++;
    }
  });
  saveWatchlist(list);
  alert(`已导入 ${added} 只推荐股票（含目标价和止损价）`);
  renderWatchlist(document.getElementById('mainContent'));
}

// 编辑自选股目标价/止损价
function editWatchStock(code) {
  const list = getWatchlist();
  const stock = list.find(s => s.code === code);
  if (!stock) return;
  const tp = prompt(`编辑 ${stock.name} 的目标价：`, stock.targetPrice || '');
  const sl = prompt(`编辑 ${stock.name} 的止损价：`, stock.stopLoss || '');
  if (tp !== null) stock.targetPrice = tp;
  if (sl !== null) stock.stopLoss = sl;
  saveWatchlist(list);
  renderWatchlist(document.getElementById('mainContent'));
}

// 每日体检报告
function renderDailyReport(list, marketCtx) {
  const evaluations = list.map(s => ({ stock: s, ev: evaluateWatchStock(s, marketCtx) }));
  return `<div class="card">
    <div class="card-title">📊 每日体检报告</div>
    <div style="padding:8px 12px;background:#0d1117;border-radius:6px;margin-bottom:12px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <span style="color:${marketCtx.color};font-weight:700">大盘环境：${marketCtx.desc}</span>
      <span style="font-size:12px;color:#8b949e">上证${marketCtx.shPct>0?'+':''}${marketCtx.shPct}% | 创业板${marketCtx.cybPct>0?'+':''}${marketCtx.cybPct}%</span>
    </div>
    <div style="overflow-x:auto"><table class="data-table">
      <tr><th>股票</th><th>信号</th><th>卖出分</th><th>买入分</th><th>换手率</th><th>资金</th><th>交易建议</th></tr>
      ${evaluations.map(({stock:s, ev}) => {
        const sigMap = {sell:'🔴 清仓',reduce:'🟠 减仓',hold:'🟡 持有',buy:'🟢 买入'};
        const sigCls = {sell:'down',reduce:'down',hold:'flat',buy:'up'};
        return `<tr>
          <td><b>${s.name}</b></td>
          <td class="${sigCls[ev.signal]||'flat'}">${sigMap[ev.signal]||'持有'}</td>
          <td class="down">${ev.sellScore}</td><td class="up">${ev.buyScore}</td>
          <td>${ev.turnover}%</td>
          <td class="${ev.capital.main.startsWith('+')?'up':'down'}">${ev.capital.main}</td>
          <td style="font-size:12px">${ev.tradeAction}</td>
        </tr>`;
      }).join('')}
    </table></div>
    <div style="margin-top:10px;font-size:11px;color:#8b949e">
      评分说明：卖出分≥80清仓 | ≥40减仓 | 买入分≥70可加仓 | 每日开盘前查看
    </div>
  </div>`;
}

// 退出预警（只显示需要卖出/减仓的股票）
function renderExitAlerts(list, marketCtx) {
  const alerts = [];
  list.forEach(s => {
    const ev = evaluateWatchStock(s, marketCtx);
    if (ev.signal === 'sell' || ev.signal === 'reduce') {
      const risk = predictRisk(s, ev);
      alerts.push({ stock: s, evaluation: ev, risk });
    }
  });
  if (!alerts.length) return '';
  return `<div class="card" style="border:2px solid #ea3943;background:#1a0a0a">
    <div class="card-title" style="color:#ea3943;font-size:18px">🚨 退出预警 — 请立即处理</div>
    ${alerts.map(a => {
      const bgColor = a.evaluation.signal==='sell' ? '#2d0a0a' : '#2d1f0a';
      const labelColor = a.evaluation.signal==='sell' ? '#ea3943' : '#f0883e';
      const label = a.evaluation.signal==='sell' ? '立即清仓' : '减仓观察';
      return `<div style="padding:12px;margin:8px 0;background:${bgColor};border-radius:8px;border-left:4px solid ${labelColor}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="background:${labelColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">${label}</span>
            <b style="margin-left:8px;font-size:15px">${a.stock.name}</b>
            <span style="color:#8b949e;font-size:12px;margin-left:6px">${a.stock.code}</span>
          </div>
          <span style="color:${labelColor};font-weight:700">${a.evaluation.tradeAction}</span>
        </div>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
          ${a.evaluation.reasons.filter(r=>r.type==='sell'||r.type==='reduce').map(r=>`<span style="font-size:12px;color:#f8d7da;background:#3d0f0f;padding:3px 8px;border-radius:4px">${r.text}</span>`).join('')}
        </div>
        ${a.risk.factors.length?`<div style="margin-top:6px;font-size:11px;color:#ea3943">暴雷风险因子：${a.risk.factors.join(' + ')} → 综合风险：${a.risk.level}</div>`:''}
        <div style="margin-top:6px">
          <button class="btn btn-danger btn-sm" onclick="removeFromWatchlist('${a.stock.code}')">清除持仓</button>
          <button class="btn btn-blue btn-sm" onclick="editWatchStock('${a.stock.code}')">修改止损</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
