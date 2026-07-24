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
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch(e) {
    console.error('saveWatchlist failed:', e);
    alert('保存失败：浏览器存储空间不足或处于隐私模式');
    return false;
  }
}

// 选股方法标签定义
const METHOD_TAGS = [
  '价值投资','趋势投资','基本面优秀','技术面突破','板块轮动',
  '超跌反弹','高分红','成长股','国产替代','行业龙头',
  '政策驱动','低PE低PB','高ROE','资金流入','AI概念',
  '新能源','半导体','消费白马','周期股','防御配置'
];

// 获取自选股中实际使用的方法标签（去重排序）
function getMethodFilterTags(list) {
  const tags = new Set();
  list.forEach(s => (s.methods || []).forEach(m => tags.add(m)));
  return [...tags].sort();
}

// 按方法标签筛选自选股
let currentMethodFilter = '';
function filterWatchlist(tag) {
  currentMethodFilter = tag;
  renderWatchlist(document.getElementById('mainContent'));
}

// 添加自选股（不再弹出prompt，直接添加）
function addToWatchlist(code, name, price, reason, methods) {
  if (!currentUser) { alert('请先登录'); return; }
  const list = getWatchlist();
  if (list.find(s => s.code === code)) { alert(name + ' 已在自选股中'); return; }
  list.push({
    code, name, price: price || '—',
    reason: reason || '',
    methods: Array.isArray(methods) ? methods : [],
    addDate: new Date().toISOString().slice(0, 10),
    addPrice: price || '—',
    targetPrice: '',
    stopLoss: ''
  });
  if (saveWatchlist(list)) {
    alert(name + ' 已加入自选股');
  }
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
  // 如果是重新加载页面，保留筛选状态；首次加载重置筛选
  if (!document.getElementById('watchAddCode')) currentMethodFilter = '';
  let list = getWatchlist();
  if (!Array.isArray(list)) list = [];
  list = list.filter(s => s && s.code && s.name);

  // 计算所有可用的筛选标签（在筛选前）
  const allFilterTags = getMethodFilterTags(list);

  // 应用选股方法筛选
  if (currentMethodFilter) {
    list = list.filter(s => (s.methods || []).includes(currentMethodFilter));
  }

  // 如果当前用户无数据，检查是否存在guest数据（修复key不匹配问题）
  if (!list.length && currentUser) {
    try {
      const guestData = JSON.parse(localStorage.getItem('stock_watchlist_guest') || '[]');
      if (guestData.length) {
        list = guestData.filter(s => s && s.code && s.name);
        // 迁移到当前用户名下
        if (list.length) saveWatchlist(list);
      }
    } catch(e) {}
  }

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
        <span style="margin-left:12px;border-left:1px solid #30363d;padding-left:12px">
          <button class="btn" style="background:#238636;color:#fff" onclick="exportWatchlist()">导出自选股</button>
          <button class="btn" style="background:#1f6feb;color:#fff" onclick="document.getElementById('importFileInput').click()">导入自选股</button>
          <input type="file" id="importFileInput" accept=".json" style="display:none" onchange="importWatchlist(event)">
        </span>
      </div>
      ${list.length ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;align-items:center">
        <span style="font-size:12px;color:#8b949e;margin-right:4px">按选股方法筛选：</span>
        <button class="btn btn-sm" onclick="filterWatchlist('')" style="font-size:11px;padding:2px 8px;background:${!currentMethodFilter?'#1f6feb':'#21262d'};color:#fff;border:1px solid ${!currentMethodFilter?'#1f6feb':'#30363d'}">全部</button>
        ${allFilterTags.map(tag => {
          const isActive = currentMethodFilter === tag;
          return `<button class="btn btn-sm" onclick="filterWatchlist('${tag}')" style="font-size:11px;padding:2px 8px;background:${isActive?'#1f6feb':'#21262d'};color:#fff;border:1px solid ${isActive?'#1f6feb':'#30363d'}">${tag}</button>`;
        }).join('')}
      </div>` : ''}
      <div style="margin-top:8px;font-size:12px;color:#8b949e">
        💡 提示：添加自选股时可设置目标价和止损价，系统将每日自动体检并提示交易信号。点击"编辑"可设置选股方法标签。
      </div>
    </div>
    <div id="dailyReportArea"><div class="card"><p style="color:#58a6ff">正在拉取大盘数据...</p></div></div>
    ${alertsHtml}
    <div id="watchlistTableCard" class="card">
      <div class="card-title">持仓明细 & 实时数据</div>
      ${tableHtml}
    </div>
  `;

  // 异步加载每日体检 + 实时行情
  loadDailyReport(list);
  refreshWatchlistRealTime();
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

// 保留旧函数兼容（trade-signal.js调用），但返回空数据让真实数据覆盖
function getCapitalData(code) {
  return {main:'0亿',days3:'0亿',days5:'0亿',trend:'加载中',risk:'low'};
}

// 异步拉取全部自选股实时行情+资金流，刷新表格显示
async function refreshWatchlistRealTime() {
  const key = 'stock_watchlist_' + (currentUser?.username || 'guest');
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  list = list.filter(s => s && s.code && s.name);
  if (currentMethodFilter) list = list.filter(s => (s.methods || []).includes(currentMethodFilter));
  if (!list.length) return;
  const results = {};
  const fetches = list.map(async s => {
    try {
      const [quote, capFlow] = await Promise.all([
        fetchAStockQuote(s.code).catch(() => null),
        fetchEMCapitalFlow(s.code).catch(() => null)
      ]);
      // API失败时用SAMPLE_STOCKS兜底
      const finalQuote = quote || SAMPLE_STOCKS[s.code] || null;
      results[s.code] = { quote: finalQuote, capFlow };
    } catch(e) {
      results[s.code] = { quote: SAMPLE_STOCKS[s.code] || null, capFlow: null };
    }
  });
  await Promise.allSettled(fetches);
  const tableCard = document.getElementById('watchlistTableCard');
  if (tableCard) {
    tableCard.innerHTML = `<div class="card-title">持仓明细 & 实时数据</div>` + renderWatchTableRealTime(list, results);
  }
}

// 使用真实数据渲染表格（股票名称可点击查看详情）
function renderWatchTableRealTime(list, results) {
  return `<div style="overflow-x:auto"><table class="data-table">
    <tr><th>代码</th><th>名称</th><th>现价</th><th>涨跌%</th><th>成交额</th><th>主力资金</th><th>散户动向</th><th>PE</th><th>状态</th><th>操作</th></tr>
    ${list.map(s => {
      const r = results[s.code] || {};
      const q = r.quote || {};
      const capFlow = r.capFlow;
      const cur = parseFloat(q.price) || parseFloat(s.price) || 0;
      const add = parseFloat(s.addPrice) || cur;
      const tp = parseFloat(s.targetPrice) || 0;
      const sl = parseFloat(s.stopLoss) || 0;
      const pct = q.pct !== undefined ? parseFloat(q.pct) : 0;
      const pctCls = pct >= 0 ? 'up' : 'down';
      const volume = q.volume || '—';
      const pe = q.pe || '—';
      let mainStr = '—', mainCls = 'flat';
      if (capFlow && capFlow.length) {
        const latest = capFlow[capFlow.length - 1];
        mainStr = (latest.main > 0 ? '+' : '') + latest.main.toFixed(2) + '亿';
        mainCls = latest.main >= 0 ? 'up' : 'down';
      }
      let retailStr = '—', retailCls = 'flat', retailIcon = '';
      if (capFlow && capFlow.length >= 2) {
        const recentSmall = capFlow.slice(-3).reduce((sum, t) => sum + (t.small || 0), 0);
        if (recentSmall > 0.3) { retailStr = '流入' + recentSmall.toFixed(2) + '亿'; retailCls = 'up'; retailIcon = '📈'; }
        else if (recentSmall < -0.3) { retailStr = '流出' + Math.abs(recentSmall).toFixed(2) + '亿'; retailCls = 'down'; retailIcon = '📉'; }
        else { retailStr = '净额' + recentSmall.toFixed(2) + '亿'; retailCls = 'flat'; retailIcon = '➡️'; }
      }
      let stopDist = '—', stopCls = 'flat', statusTag = '<span class="factor-tag tag-positive">安全</span>';
      if (sl > 0 && cur > 0) {
        const dist = ((cur - sl) / sl * 100).toFixed(1);
        stopDist = dist + '%';
        stopCls = dist < 3 ? 'down' : dist < 8 ? 'flat' : 'up';
        if (cur <= sl) statusTag = '<span class="factor-tag tag-negative">已破止损</span>';
        else if (dist < 3) statusTag = '<span class="factor-tag tag-negative">危险</span>';
        else if (dist < 8) statusTag = '<span class="factor-tag tag-neutral">警戒</span>';
      }
      const pnl = add > 0 ? ((cur - add) / add * 100).toFixed(2) : '0.00';
      const pnlCls = pnl > 0 ? 'up' : pnl < 0 ? 'down' : 'flat';
      return `<tr style="cursor:pointer" onclick="showStockDetail('${s.code}')">
        <td>${s.code||''}</td>
        <td><b style="color:#58a6ff;text-decoration:underline">${s.name||''}</b>${renderMethodTags(s.methods)}</td>
        <td style="font-weight:bold">${cur || '—'}</td>
        <td class="${pctCls}" style="font-weight:bold">${pct ? (pct>=0?'+':'') + pct.toFixed(2) + '%' : '—'}</td>
        <td>${volume}</td>
        <td class="${mainCls}" style="font-weight:bold">${mainStr}</td>
        <td class="${retailCls}">${retailIcon} ${retailStr}</td>
        <td>${pe}</td>
        <td>${statusTag}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-blue btn-sm" onclick="editWatchStock('${s.code}')">编辑</button>
          <button class="btn btn-danger btn-sm" onclick="removeFromWatchlist('${s.code}')">移除</button>
        </td>
      </tr>`;
    }).join('')}
  </table></div>
  <div style="margin-top:8px;font-size:12px;color:#8b949e">💡 点击股票名称可查看个股详细分析</div>`;
}

// 选股方法颜色映射
function getMethodTagColor(method) {
  const map = {
    '价值投资':'#238636','行业龙头':'#58a6ff','高ROE':'#238636','消费白马':'#f0883e',
    '新能源':'#16c784','成长股':'#a371f7','AI概念':'#a371f7','政策驱动':'#d29922',
    '国产替代':'#58a6ff','半导体':'#58a6ff','超跌反弹':'#ea3943','高分红':'#238636',
    '低PE低PB':'#238636','技术面突破':'#a371f7','资金流入':'#16c784','防御配置':'#8b949e',
    '趋势投资':'#a371f7','板块轮动':'#d29922','基本面优秀':'#238636','周期股':'#f0883e',
    '光伏':'#16c784','储能':'#16c784'
  };
  return map[method] || '#8b949e';
}

function renderMethodTags(methods) {
  if (!methods || !methods.length) return '';
  return `<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:3px">
    ${methods.map(m => `<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:${getMethodTagColor(m)}22;color:${getMethodTagColor(m)};border:1px solid ${getMethodTagColor(m)}44">${m}</span>`).join('')}
  </div>`;
}

// 带主力资金的表格（初始渲染显示加载中，异步替换为真实数据）
function renderWatchTableWithCapital(list) {
  return `<div style="text-align:center;padding:20px;color:#58a6ff">
    <p>正在加载实时行情和资金流数据...</p>
    <div style="margin-top:8px;font-size:12px;color:#8b949e">共${list.length}只自选股，正在并行拉取行情+资金流</div>
  </div>`;
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
  if (!currentUser) { alert('请先登录'); return; }
  const code = document.getElementById('watchAddCode').value.trim();
  const name = document.getElementById('watchAddName').value.trim();
  const price = document.getElementById('watchAddPrice').value.trim();
  if (!code || !name) { alert('请输入代码和名称'); return; }
  const list = getWatchlist();
  if (list.find(s => s.code === code)) { alert(name + ' 已在自选股中'); return; }
  list.push({
    code, name, price: price || '—',
    reason: '手动添加',
    methods: [],
    addDate: new Date().toISOString().slice(0, 10),
    addPrice: price || '—',
    targetPrice: '', stopLoss: ''
  });
  if (saveWatchlist(list)) {
    alert(name + ' 已加入自选股');
  }
  renderWatchlist(document.getElementById('mainContent'));
}

// 一键导入推荐股票
function addRecommendStocks() {
  if (!currentUser) { alert('请先登录'); return; }
  const recommends = [
    {code:'sh600519',name:'贵州茅台',price:'1756',reason:'白酒龙头，ROE>30%',targetPrice:'1900',stopLoss:'1650',methods:['价值投资','行业龙头','高ROE','消费白马']},
    {code:'sz300750',name:'宁德时代',price:'218.5',reason:'动力电池全球龙头',targetPrice:'250',stopLoss:'200',methods:['行业龙头','新能源','成长股','政策驱动']},
    {code:'sz002594',name:'比亚迪',price:'285.6',reason:'新能源车龙头，智驾+出海',targetPrice:'320',stopLoss:'260',methods:['行业龙头','新能源','成长股','政策驱动','AI概念']},
    {code:'sh601012',name:'隆基绿能',price:'25.8',reason:'光伏龙头超跌反弹',targetPrice:'32',stopLoss:'22',methods:['超跌反弹','新能源','行业龙头']},
    {code:'sh688981',name:'中芯国际',price:'78.9',reason:'半导体国产替代核心',targetPrice:'90',stopLoss:'72',methods:['国产替代','半导体','政策驱动','行业龙头']},
    {code:'sz002371',name:'北方华创',price:'345',reason:'半导体设备龙头',targetPrice:'380',stopLoss:'320',methods:['国产替代','半导体','行业龙头','成长股']},
    {code:'sh603501',name:'韦尔股份',price:'98.5',reason:'CIS芯片龙头',targetPrice:'110',stopLoss:'88',methods:['半导体','国产替代','成长股']},
    {code:'sz000333',name:'美的集团',price:'68.3',reason:'家电白马，稳定分红',targetPrice:'78',stopLoss:'62',methods:['价值投资','高分红','消费白马','低PE低PB']},
  ];
  const list = getWatchlist();
  let added = 0;
  recommends.forEach(r => {
    if (!list.find(s => s.code === r.code)) {
      list.push({...r, addDate: new Date().toISOString().slice(0,10), addPrice: r.price});
      added++;
    }
  });
  if (saveWatchlist(list)) {
    alert(`已导入 ${added} 只推荐股票（含目标价和止损价）`);
  }
  renderWatchlist(document.getElementById('mainContent'));
}

// 编辑自选股（弹窗编辑）
function editWatchStock(code) {
  const list = getWatchlist();
  const stock = list.find(s => s.code === code);
  if (!stock) return;
  // 使用多步prompt收集信息
  const tp = prompt(`编辑 ${stock.name} 的目标价（当前：${stock.targetPrice || '未设置'}）：`, stock.targetPrice || '');
  const sl = prompt(`编辑 ${stock.name} 的止损价（当前：${stock.stopLoss || '未设置'}）：`, stock.stopLoss || '');
  const r = prompt(`编辑 ${stock.name} 的买入理由（当前：${stock.reason || ''}）：`, stock.reason || '');
  // 选股方法：逗号分隔
  const currentMethods = (stock.methods || []).join('、');
  const m = prompt(`编辑选股方法（当前：${currentMethods || '无'}）\n可选标签：${METHOD_TAGS.join('、')}\n多个用逗号分隔，如：价值投资,行业龙头,高分红`, currentMethods);
  if (tp !== null) stock.targetPrice = tp;
  if (sl !== null) stock.stopLoss = sl;
  if (r !== null) stock.reason = r;
  if (m !== null) {
    stock.methods = m.split(/[,，、]/).map(s=>s.trim()).filter(s=>s);
  }
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

// 导出自选股为 JSON 文件
function exportWatchlist() {
  const list = getWatchlist();
  if (!list.length) { alert('自选股为空，无需导出'); return; }
  const data = {
    exportTime: new Date().toISOString(),
    user: currentUser?.username || 'guest',
    stocks: list
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'watchlist_' + (currentUser?.username||'guest') + '_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 导入自选股从 JSON 文件
function importWatchlist(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const importList = Array.isArray(data.stocks) ? data.stocks : (Array.isArray(data) ? data : null);
      if (!importList) { alert('文件格式不正确'); return; }
      const currentList = getWatchlist();
      let added = 0;
      importList.forEach(s => {
        if (!s.code || !s.name) return;
        if (!currentList.find(c => c.code === s.code)) {
          currentList.push(s);
          added++;
        }
      });
      if (saveWatchlist(currentList)) {
        alert('导入成功，新增 ' + added + ' 只股票（已跳过重复）');
      }
      renderWatchlist(document.getElementById('mainContent'));
    } catch(err) {
      alert('导入失败：文件解析错误');
      console.error('importWatchlist error:', err);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// 个股详情弹窗 — 点击自选股名称触发
async function showStockDetail(code) {
  if (!code) return;
  const list = getWatchlist();
  const stock = list.find(s => s.code === code);
  const stockName = stock?.name || code;

  // 创建弹窗遮罩
  let overlay = document.getElementById('stockDetailOverlay');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'stockDetailOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);

  // 弹窗主体
  const modal = document.createElement('div');
  modal.style.cssText = 'background:#0d1117;border:1px solid #30363d;border-radius:12px;max-width:800px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;color:#e6e6e6';
  modal.innerHTML = `<div style="text-align:center;padding:30px;color:#58a6ff">
    <p>正在加载 ${stockName}（${code}）的详细数据...</p>
    <div style="margin-top:8px;font-size:12px;color:#8b949e">行情 + 资金流 + K线 + AI分析</div>
  </div>`;
  overlay.appendChild(modal);

  // 并行拉取所有数据
  let quote = null, capFlow = null, emDetail = null;
  try {
    [quote, capFlow, emDetail] = await Promise.all([
      fetchAStockQuote(code).catch(() => null),
      fetchEMCapitalFlow(code).catch(() => null),
      fetchEMStockDetail(code).catch(() => null)
    ]);
  } catch(e) {}

  // 兜底
  quote = quote || SAMPLE_STOCKS[code] || { name: stockName, price: '—', pct: 0, pe: '—', pb: '—', volume: '—' };

  const cur = parseFloat(quote.price) || 0;
  const pct = parseFloat(quote.pct) || 0;
  const pctCls = pct >= 0 ? 'up' : 'down';
  const change = parseFloat(quote.change) || 0;
  const volume = quote.volume || '—';
  const pe = quote.pe || emDetail?.f162 || '—';
  const pb = quote.pb || emDetail?.f167 || '—';

  // 资金流汇总
  let capSummary = '<span style="color:#8b949e">暂无数据</span>';
  let retailSummary = '<span style="color:#8b949e">暂无数据</span>';
  let capHistory = '';
  if (capFlow && capFlow.length) {
    const latest = capFlow[capFlow.length - 1];
    const mainCls = latest.main >= 0 ? 'up' : 'down';
    capSummary = `<span class="${mainCls}" style="font-weight:bold">${latest.main > 0 ? '+' : ''}${latest.main.toFixed(2)}亿</span>
      <span style="color:#8b949e;font-size:12px;margin-left:8px">${latest.date}</span>`;

    // 近3日散户累计
    const recentSmall = capFlow.slice(-3).reduce((sum, t) => sum + (t.small || 0), 0);
    const retailCls = recentSmall > 0.3 ? 'up' : recentSmall < -0.3 ? 'down' : 'flat';
    const retailIcon = recentSmall > 0.3 ? '📈' : recentSmall < -0.3 ? '📉' : '➡️';
    retailSummary = `${retailIcon} <span class="${retailCls}" style="font-weight:bold">${recentSmall > 0 ? '+' : ''}${recentSmall.toFixed(2)}亿（近3日）</span>`;

    // 资金流历史表格
    capHistory = `<table class="data-table" style="font-size:12px;margin-top:8px">
      <tr><th>日期</th><th>主力</th><th>超大单</th><th>大单</th><th>中单</th><th>散户</th></tr>
      ${capFlow.slice(-5).reverse().map(t => {
        const mCls = t.main >= 0 ? 'up' : 'down';
        const sCls = t.small >= 0 ? 'up' : 'down';
        return `<tr>
          <td>${t.date}</td>
          <td class="${mCls}">${t.main > 0 ? '+' : ''}${t.main.toFixed(2)}亿</td>
          <td>${t.super > 0 ? '+' : ''}${t.super.toFixed(2)}亿</td>
          <td>${t.big > 0 ? '+' : ''}${t.big.toFixed(2)}亿</td>
          <td>${t.mid > 0 ? '+' : ''}${t.mid.toFixed(2)}亿</td>
          <td class="${sCls}">${t.small > 0 ? '+' : ''}${t.small.toFixed(2)}亿</td>
        </tr>`;
      }).join('')}
    </table>`;
  }

  // 自选股信息
  let watchInfo = '';
  if (stock) {
    const addP = parseFloat(stock.addPrice) || 0;
    const tp = parseFloat(stock.targetPrice) || 0;
    const sl = parseFloat(stock.stopLoss) || 0;
    const pnl = addP > 0 ? ((cur - addP) / addP * 100).toFixed(2) : '0.00';
    const pnlCls = pnl > 0 ? 'up' : pnl < 0 ? 'down' : 'flat';
    watchInfo = `<div style="margin-top:12px;padding:12px;background:#161b22;border-radius:8px;border:1px solid #30363d">
      <div style="font-weight:bold;color:#58a6ff;margin-bottom:8px">📋 持仓信息</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;font-size:13px">
        <div>成本价：<b>${stock.addPrice || '—'}</b></div>
        <div>盈亏：<b class="${pnlCls}">${pnl > 0 ? '+' : ''}${pnl}%</b></div>
        <div>目标价：<b class="up">${stock.targetPrice || '—'}</b></div>
        <div>止损价：<b class="down">${stock.stopLoss || '—'}</b></div>
        <div>买入日期：<b>${stock.addDate || '—'}</b></div>
        <div>选股理由：<b style="font-size:12px">${stock.reason || '—'}</b></div>
      </div>
      ${renderMethodTags(stock.methods)}
    </div>`;
  }

  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <h2 style="margin:0;color:#e6e6e6">${stockName}</h2>
        <span style="color:#8b949e;font-size:13px">${code}</span>
      </div>
      <button onclick="document.getElementById('stockDetailOverlay').remove()" style="background:#da3633;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px">关闭</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px">
      <div style="padding:12px;background:#161b22;border-radius:8px;border:1px solid #30363d">
        <div style="color:#8b949e;font-size:12px">现价</div>
        <div style="font-size:22px;font-weight:bold;color:#e6e6e6">${cur || '—'}</div>
      </div>
      <div style="padding:12px;background:#161b22;border-radius:8px;border:1px solid #30363d">
        <div style="color:#8b949e;font-size:12px">涨跌幅</div>
        <div style="font-size:22px;font-weight:bold" class="${pctCls}">${pct ? (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%' : '—'}</div>
      </div>
      <div style="padding:12px;background:#161b22;border-radius:8px;border:1px solid #30363d">
        <div style="color:#8b949e;font-size:12px">成交额</div>
        <div style="font-size:18px;font-weight:bold;color:#e6e6e6">${volume}</div>
      </div>
      <div style="padding:12px;background:#161b22;border-radius:8px;border:1px solid #30363d">
        <div style="color:#8b949e;font-size:12px">PE / PB</div>
        <div style="font-size:18px;font-weight:bold;color:#e6e6e6">${pe} / ${pb}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="padding:12px;background:#161b22;border-radius:8px;border:1px solid #30363d">
        <div style="color:#8b949e;font-size:12px;margin-bottom:4px">主力资金（今日）</div>
        ${capSummary}
      </div>
      <div style="padding:12px;background:#161b22;border-radius:8px;border:1px solid #30363d">
        <div style="color:#8b949e;font-size:12px;margin-bottom:4px">散户动向</div>
        ${retailSummary}
      </div>
    </div>

    ${capHistory ? `<div style="margin-bottom:16px">
      <div style="font-weight:bold;color:#58a6ff;margin-bottom:8px">💰 近5日资金流向</div>
      ${capHistory}
    </div>` : ''}

    ${watchInfo}

    <div style="margin-top:16px;text-align:center">
      <button class="btn btn-primary" onclick="startAIAnalysisDirect('${code}','${stockName}')" style="margin-right:8px">🧠 AI深度分析</button>
      <button class="btn btn-blue" onclick="document.getElementById('stockDetailOverlay').remove();editWatchStock('${code}')">✏️ 编辑持仓</button>
    </div>
  `;
}
