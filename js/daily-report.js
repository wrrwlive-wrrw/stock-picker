// 每日分析报告模块

function getReportList() {
  const key = 'stock_reports_' + (currentUser?.username || 'guest');
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveReport(report) {
  const key = 'stock_reports_' + (currentUser?.username || 'guest');
  const list = getReportList();
  list.unshift(report);
  if (list.length > 60) list.length = 60;
  localStorage.setItem(key, JSON.stringify(list));
  if (typeof autoBackupUserData === 'function') autoBackupUserData();
}

function deleteReport(id) {
  const key = 'stock_reports_' + (currentUser?.username || 'guest');
  let list = getReportList();
  list = list.filter(r => r.id !== id);
  localStorage.setItem(key, JSON.stringify(list));
}

function isAutoReportOn() {
  return localStorage.getItem('stock_report_auto_' + (currentUser?.username || 'guest')) === 'on';
}

function toggleAutoReport() {
  const key = 'stock_report_auto_' + (currentUser?.username || 'guest');
  const current = localStorage.getItem(key) === 'on';
  localStorage.setItem(key, current ? 'off' : 'on');
  renderReportsPage(document.getElementById('mainContent'));
}

function cleanOldReports() {
  const key = 'stock_reports_' + (currentUser?.username || 'guest');
  let list = getReportList();
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  list = list.filter(r => r.createTime > cutoff);
  localStorage.setItem(key, JSON.stringify(list));
}

function renderReportsPage(el) {
  cleanOldReports();
  const reports = getReportList();
  const today = new Date().toISOString().slice(0, 10);
  const todayReports = reports.filter(r => r.date === today);
  const autoOn = isAutoReportOn();

  el.innerHTML = `
    <div class="card">
      <div class="card-title">📋 每日分析报告</div>
      <p style="color:#8b949e;font-size:13px">自动生成大盘和自选股分析报告，历史记录可回溯查询</p>
      <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="doGenerateMarketReport()">生成大盘报告</button>
        <button class="btn btn-blue" onclick="doGenerateWatchlistReport()">生成自选股报告</button>
        <label style="font-size:12px;color:#8b949e;cursor:pointer">
          <input type="checkbox" ${autoOn ? 'checked' : ''} onchange="toggleAutoReport()"> 开启自动生成
        </label>
        <span style="font-size:12px;color:#8b949e">今日已生成 ${todayReports.length} 份报告</span>
      </div>
      <div id="reportGenStatus" style="margin-top:8px;font-size:12px;color:#58a6ff"></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-title">历史报告</div>
      <div style="margin-bottom:10px;display:flex;gap:8px">
        <select id="reportTypeFilter" onchange="filterReports()" style="padding:6px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px;font-size:12px">
          <option value="all">全部类型</option>
          <option value="market">大盘报告</option>
          <option value="watchlist">自选股报告</option>
        </select>
      </div>
      <div id="reportListContainer">${renderReportList(reports)}</div>
    </div>
    <div id="reportDetailModal"></div>
  `;

  if (autoOn && todayReports.length === 0) {
    setTimeout(() => autoGenerateToday(), 500);
  }
}

function renderReportList(reports) {
  if (!reports.length) return '<p style="color:#8b949e;font-size:13px">暂无报告记录</p>';
  return reports.map(r => `
    <div style="padding:10px;border:1px solid #30363d;border-radius:6px;margin-bottom:8px;background:#0d1117">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="color:${r.type === 'market' ? '#58a6ff' : '#f0883e'};font-size:12px;padding:2px 6px;border:1px solid ${r.type === 'market' ? '#58a6ff' : '#f0883e'};border-radius:3px">${r.type === 'market' ? '大盘' : '自选股'}</span>
          <span style="color:#e6e6e6;margin-left:8px;font-size:14px">${r.title}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="color:#8b949e;font-size:11px">${new Date(r.createTime).toLocaleString('zh-CN')}</span>
          <button class="btn btn-blue btn-sm" onclick="viewReportDetail('${r.id}')">查看</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteReport('${r.id}')">删除</button>
        </div>
      </div>
      <p style="color:#8b949e;font-size:12px;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.summary || ''}</p>
    </div>
  `).join('');
}

function filterReports() {
  const type = document.getElementById('reportTypeFilter').value;
  let reports = getReportList();
  if (type !== 'all') reports = reports.filter(r => r.type === type);
  document.getElementById('reportListContainer').innerHTML = renderReportList(reports);
}

function confirmDeleteReport(id) {
  if (!confirm('确定删除此报告？')) return;
  deleteReport(id);
  renderReportsPage(document.getElementById('mainContent'));
}

function viewReportDetail(id) {
  const reports = getReportList();
  const r = reports.find(x => x.id === id);
  if (!r) return;
  const content = makeStockCodesClickable(r.content);
  document.getElementById('reportDetailModal').innerHTML = `
    <div id="reportOverlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)closeReportDetail()">
      <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;width:90%;max-width:800px;max-height:80vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="color:#e6e6e6;margin:0">${r.title}</h3>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" style="background:#238636;color:#fff" onclick="downloadReportDetail('${r.id}')">📥 下载MD</button>
            <button class="btn btn-sm" style="background:#d4380d;color:#fff" onclick="exportReportPDF('${r.id}')">📄 导出PDF</button>
            <button class="btn btn-sm" style="background:#30363d;color:#e6e6e6" onclick="closeReportDetail()">关闭</button>
          </div>
        </div>
        <div style="color:#8b949e;font-size:12px;margin-bottom:12px">生成时间：${new Date(r.createTime).toLocaleString('zh-CN')}</div>
        <div style="color:#c9d1d9;line-height:1.7;font-size:14px">${content}</div>
      </div>
    </div>
  `;
}

// 将报告中的股票代码转为可点击链接
function makeStockCodesClickable(html) {
  return html.replace(/(sh|sz)(\d{6})/g, '<a href="#" onclick="event.preventDefault();showReportStockFlow(\'$1$2\')" style="color:#58a6ff;text-decoration:underline;cursor:pointer" title="点击查看资金流向">$1$2</a>');
}

// 报告弹窗：查看个股早盘+尾盘资金流向
async function showReportStockFlow(code) {
  // 获取股票名称
  const list = JSON.parse(localStorage.getItem('stock_watchlist_' + (currentUser?.username || 'guest')) || '[]');
  const stock = list.find(s => s.code === code);
  const stockName = stock?.name || code;
  // 创建弹窗
  let overlay = document.getElementById('reportFlowOverlay');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'reportFlowOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1010;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  const modal = document.createElement('div');
  modal.style.cssText = 'background:#0d1117;border:1px solid #30363d;border-radius:12px;max-width:500px;width:100%;padding:24px;color:#e6e6e6';
  modal.innerHTML = `<div style="text-align:center;padding:20px;color:#58a6ff">⏳ 加载 ${stockName} 资金流向数据...</div>`;
  overlay.appendChild(modal);
  // 获取分时资金流
  const intraday = await fetchEMIntradayFlow(code);
  if (!intraday || !intraday.length) {
    modal.innerHTML = `<div style="text-align:center;padding:20px;color:#8b949e">暂无分时资金数据</div>
      <button onclick="this.closest('#reportFlowOverlay').remove()" style="display:block;margin:10px auto;background:#30363d;color:#e6e6e6;border:none;padding:6px 20px;border-radius:6px;cursor:pointer">关闭</button>`;
    return;
  }
  // 筛选早盘9:30-11:30
  const morningData = intraday.filter(d => {
    if (!d.time) return false;
    const p = d.time.split(':'); const h = parseInt(p[0]), m = parseInt(p[1]);
    return (h === 9 && m >= 30) || h === 10 || (h === 11 && m <= 30);
  });
  // 尾盘14:30-15:00（含集合竞价）
  const tailData = intraday.filter(d => {
    if (!d.time) return false;
    const p = d.time.split(':'); const h = parseInt(p[0]), m = parseInt(p[1]);
    return (h === 14 && m >= 30) || (h === 15 && m === 0);
  });
  const sum = data => data.reduce((s, d) => s + (d.main || 0), 0);
  const morningNet = sum(morningData);
  const tailNet = sum(tailData);
  const morningBig = morningData.reduce((s, d) => s + (d.big||0) + (d.super||0), 0);
  const tailBig = tailData.reduce((s, d) => s + (d.big||0) + (d.super||0), 0);
  const fmt = v => `${v >= 0 ? '+' : ''}${(v/10000).toFixed(2)}亿`;
  const cls = v => v >= 0 ? 'up' : 'down';
  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;color:#e6e6e6">${stockName} <span style="font-size:13px;color:#8b949e">${code}</span></h3>
      <button class="btn btn-sm" style="background:#30363d;color:#e6e6e6" onclick="this.closest('#reportFlowOverlay').remove()">关闭</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="padding:12px;background:#0d1117;border:1px solid #30363d;border-radius:8px">
        <div style="font-size:12px;color:#58a6ff;font-weight:700;margin-bottom:8px">☀️ 早盘资金 (9:30-11:30)</div>
        <div style="font-size:11px;color:#8b949e">主力净流入</div>
        <div class="${cls(morningNet)}" style="font-size:18px;font-weight:700">${fmt(morningNet)}</div>
        <div style="margin-top:6px;font-size:11px;color:#8b949e">大单净额：<span class="${cls(morningBig)}">${fmt(morningBig)}</span></div>
        <div style="font-size:11px;color:#8b949e">数据分钟：${morningData.length}笔</div>
      </div>
      <div style="padding:12px;background:#0d1117;border:1px solid #30363d;border-radius:8px">
        <div style="font-size:12px;color:#f0883e;font-weight:700;margin-bottom:8px">🏁 尾盘资金 (14:30-15:00)</div>
        <div style="font-size:11px;color:#8b949e">主力净流入</div>
        <div class="${cls(tailNet)}" style="font-size:18px;font-weight:700">${fmt(tailNet)}</div>
        <div style="margin-top:6px;font-size:11px;color:#8b949e">大单净额：<span class="${cls(tailBig)}">${fmt(tailBig)}</span></div>
        <div style="font-size:11px;color:#8b949e">数据分钟：${tailData.length}笔</div>
      </div>
    </div>
    <div style="margin-top:12px;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px;font-size:11px">
      <div style="font-weight:700;margin-bottom:4px;color:#8b949e">分析结论</div>
      ${morningNet < -200 ? '<div style="color:#ea3943">🔴 早盘主力大幅流出 >2亿，警惕午后进一步杀跌</div>' : morningNet < -100 ? '<div style="color:#f0883e">🟠 早盘主力流出 >1亿，关注午后资金是否回流</div>' : morningNet > 200 ? '<div style="color:#3fb950">🟢 早盘主力大幅流入 >2亿，走势较强</div>' : '<div style="color:#8b949e">⚪ 早盘资金面相对平稳</div>'}
      ${tailNet < -50 ? '<div style="color:#ea3943">🔴 尾盘主力大幅流出，有不计成本砸盘迹象</div>' : tailNet < -20 ? '<div style="color:#f0883e">🟠 尾盘主力流出，有一定抛压</div>' : tailNet > 50 ? '<div style="color:#f0883e">🟠 尾盘主力拉抬，警惕诱多</div>' : '<div style="color:#8b949e">⚪ 尾盘资金面相对平稳</div>'}
    </div>
    <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;max-height:180px;overflow-y:auto;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px">
      <div style="font-size:11px;color:#8b949e;width:100%;font-weight:700">分时资金流向明细</div>
      ${intraday.map(d => {
        const mCls = d.main >= 0 ? 'up' : 'down';
        return `<div style="font-size:10px;width:50%;display:flex;gap:4px">
          <span style="color:#8b949e">${d.time}</span>
          <span class="${mCls}">${(d.main/10000).toFixed(2)}亿</span>
        </div>`;
      }).join('')}
    </div>
    <button onclick="this.closest('#reportFlowOverlay').remove()" style="display:block;margin:16px auto 0;background:#30363d;color:#e6e6e6;border:none;padding:8px 30px;border-radius:6px;cursor:pointer">关闭</button>
  `;
}
function closeReportDetail() {
  const overlay = document.getElementById('reportOverlay');
  if (overlay) overlay.remove();
}

async function doGenerateMarketReport() {
  const statusEl = document.getElementById('reportGenStatus');
  if (!statusEl) return;
  const apiKey = getAIKey();
  if (!apiKey) { statusEl.innerHTML = '<span style="color:#f85149">请先在"每日分析"页面配置API Key</span>'; return; }
  statusEl.innerHTML = '⏳ 正在获取大盘数据并生成报告...';

  try {
    const indexData = await fetchIndexData();
    const prompt = buildMarketReportPrompt(indexData);
    const result = await callReportAI(apiKey, prompt);
    const today = new Date().toISOString().slice(0, 10);
    const html = formatReportContent(result);
    const summary = result.slice(0, 80).replace(/[#*\n]/g, '') + '...';

    const report = {
      id: 'rpt_' + today + '_market_' + Date.now(),
      type: 'market',
      title: today + ' 大盘分析报告',
      date: today,
      createTime: Date.now(),
      content: html,
      summary: summary
    };
    saveReport(report);
    statusEl.innerHTML = '<span style="color:#3fb950">大盘报告生成成功！</span>';
    setTimeout(() => renderReportsPage(document.getElementById('mainContent')), 1000);
  } catch (e) {
    statusEl.innerHTML = `<span style="color:#f85149">生成失败：${e.message}</span>`;
  }
}

function buildMarketReportPrompt(indexData) {
  const idx = indexData || SAMPLE_INDEX;
  let dataStr = '';
  for (const [k, v] of Object.entries(idx)) {
    dataStr += `${v.name}：${v.value} (${v.pct > 0 ? '+' : ''}${v.pct}%)\n`;
  }
  return `你是资深A股投研总监，请根据以下实时大盘数据生成今日深度分析报告：

${dataStr}

报告要求：
1. 今日大盘走势总结（多空力量对比、量能变化、涨跌家数）
2. 技术面关键位分析（支撑位/压力位、均线状态、MACD信号）
3. 资金面动向（北向资金流向、主力板块资金流向、融资余额变化）
4. 热点板块轮动分析（领涨/领跌板块、持续性判断、龙头股表现）
5. 风险因素（利空事件、解禁潮、政策风险）
6. 明日走势预判（上涨/震荡/下跌概率，给出具体理由）
7. 操作建议（仓位建议、进攻/防御方向、具体板块推荐）

格式要求：使用markdown格式，##分段，关键数据加粗，结论给出概率判断。限制2000字以内。`;
}

function buildWatchlistReportPrompt(watchlist, indexData, quotes) {
  const idx = indexData || SAMPLE_INDEX;
  let marketStr = '';
  for (const [k, v] of Object.entries(idx)) {
    if (['sh000001','sz399001','sz399006'].includes(k)) {
      marketStr += `${v.name}：${v.value} (${v.pct > 0 ? '+' : ''}${v.pct}%)\n`;
    }
  }
  let stockStr = watchlist.map((s, i) => {
    const qData = (quotes && quotes[s.code]) || {};
    const q = qData.quote || {};
    const capFlow = qData.capFlow;
    // 使用实时价格
    const price = q.price || s.price || '—';
    const pct = q.pct !== undefined ? (q.pct > 0 ? '+' : '') + q.pct + '%' : '未知';
    const pe = q.pe || '—';
    const pb = q.pb || '—';
    const volume = q.volume || '—';
    // 资金流
    let capStr = '资金数据未知';
    if (capFlow && capFlow.length) {
      const latest = capFlow[capFlow.length - 1];
      capStr = `主力${latest.main > 0 ? '+' : ''}${latest.main.toFixed(2)}亿`;
      // 近3日散户
      const recentSmall = capFlow.slice(-3).reduce((sum, t) => sum + (t.small || 0), 0);
      capStr += ` | 散户${recentSmall > 0 ? '流入' : '流出'}${Math.abs(recentSmall).toFixed(2)}亿`;
    }
    // 盈亏计算
    const costNum = parseFloat(s.costPrice || s.addPrice) || 0;
    const curPrice = parseFloat(price) || 0;
    const pnl = costNum > 0 && curPrice > 0 ? (((curPrice - costNum) / costNum) * 100).toFixed(2) + '%' : '未知';
    const methods = (s.methods || []).join('/') || '无';
    return `${i+1}. ${s.name}(${s.code}) | 现价:${price} 涨跌:${pct} PE:${pe} PB:${pb} 成交量:${volume} | 成本:${s.costPrice||s.addPrice||'未知'} 盈亏:${pnl} | 目标价:${s.targetPrice||'未设'} 止损价:${s.stopLoss||'未设'} | ${capStr} | 选股方法:${methods} | 买入理由:${s.reason||'无'}`;
  }).join('\n');

  return `你是资深A股投研总监，请对以下自选股组合进行今日深度体检分析（所有行情数据均为实时数据）：

大盘环境（实时数据）：
${marketStr}

自选股列表（含实时行情、资金流、成本盈亏）：
${stockStr}

对每只股票必须分析：
1. 当前技术面状态（趋势方向、关键均线位置、支撑/压力位）
2. 资金面判断（主力进出方向、量能变化、散户情绪）
3. 估值水平（PE/PB与行业对比，是否存在泡沫）
4. 风险评估（距止损位距离、潜在风险点、暴雷概率）
5. 持仓盈亏分析：基于成本价和当前价，给出明确的持有/减仓/清仓建议
6. 具体操作价位：买入区间、目标价、止损价

**核心要求**：每只股票必须给出以下明确信号之一：
- 🟢 **建议持有**（附持有理由和目标价）
- 🟡 **建议减仓**（附减仓比例和时机）
- 🔴 **建议清仓**（附清仓理由和止损价）

最后给出：
- 组合整体健康度评分（1-100分）
- 调仓建议（哪些该加仓、哪些该减仓、哪些该清仓，给出具体理由）
- 风险预警（哪些股票有暴雷风险）
- 今日操作策略（总仓位建议、攻防配比）

格式：markdown，每只股票用##分段，操作信号加粗标注。限制2500字以内。`;
}

async function callReportAI(apiKey, userPrompt) {
  const aiCfg = typeof getAIConfig === 'function' ? getAIConfig() : { url: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen3-32B' };
  const body = {
    model: aiCfg.model,
    messages: [
      { role: 'system', content: '你是一位专业的A股投研分析师，擅长技术分析、基本面分析和市场情绪判断。请提供专业、客观、有数据支撑的分析报告。' },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4,
    max_tokens: 8000
  };
  const resp = await fetch(aiCfg.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error('AI接口返回错误: ' + resp.status);
  const data = await resp.json();
  let content = data.choices?.[0]?.message?.content || '';
  content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return content;
}

function formatReportContent(md) {
  let html = md
    .replace(/## (.*)/g, '<h3 style="color:#58a6ff;margin-top:16px;margin-bottom:8px">$1</h3>')
    .replace(/### (.*)/g, '<h4 style="color:#79c0ff;margin-top:12px;margin-bottom:6px">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f0883e">$1</strong>')
    .replace(/\n- /g, '\n<br>• ')
    .replace(/\n\d+\. /g, (m) => '\n<br>' + m.trim() + ' ')
    .replace(/\n/g, '<br>');
  return html;
}

async function autoGenerateToday() {
  const statusEl = document.getElementById('reportGenStatus');
  if (statusEl) statusEl.innerHTML = '⏳ 自动生成中...';
  await doGenerateMarketReport();
  const watchlist = JSON.parse(localStorage.getItem('stock_watchlist_' + (currentUser?.username || 'guest')) || '[]');
  if (watchlist.length > 0) {
    await doGenerateWatchlistReport();
  }
}

async function doGenerateWatchlistReport() {
  const statusEl = document.getElementById('reportGenStatus');
  if (!statusEl) return;
  const apiKey = getAIKey();
  if (!apiKey) { statusEl.innerHTML = '<span style="color:#f85149">请先在"每日分析"页面配置API Key</span>'; return; }

  const watchlist = JSON.parse(localStorage.getItem('stock_watchlist_' + (currentUser?.username || 'guest')) || '[]');
  if (!watchlist.length) { statusEl.innerHTML = '<span style="color:#f85149">自选股为空，请先添加自选股</span>'; return; }
  statusEl.innerHTML = '⏳ 正在拉取实时行情和资金流数据...';

  // 批量拉取所有股票行情（1次请求）
  const codes = watchlist.map(s => s.code);
  let quotesMap = {};
  try {
    quotesMap = await fetchAStockQuotesBatch(codes);
  } catch(e) { console.warn('批量行情失败', e); }

  // 串行拉取资金流（每请求间隔300ms避免代理429限流）
  const quotes = {};
  for (let i = 0; i < watchlist.length; i++) {
    const s = watchlist[i];
    statusEl.innerHTML = `⏳ 拉取资金流数据... (${i+1}/${watchlist.length}) ${s.name}`;
    const quote = quotesMap[s.code] || SAMPLE_STOCKS[s.code] || null;
    let capFlow = null;
    try {
      capFlow = await fetchEMCapitalFlow(s.code);
      if (!capFlow || !capFlow.length) capFlow = null;
    } catch(e) {}
    quotes[s.code] = { quote, capFlow };
    await new Promise(r => setTimeout(r, 300));
  }
  statusEl.innerHTML = '⏳ 实时数据已获取，AI分析中...';

  try {
    const indexData = await fetchIndexData();
    const prompt = buildWatchlistReportPrompt(watchlist, indexData, quotes);
    const result = await callReportAI(apiKey, prompt);
    const today = new Date().toISOString().slice(0, 10);
    const html = formatReportContent(result);
    const summary = result.slice(0, 80).replace(/[#*\n]/g, '') + '...';

    const report = {
      id: 'rpt_' + today + '_watchlist_' + Date.now(),
      type: 'watchlist',
      title: today + ' 自选股分析报告',
      date: today,
      createTime: Date.now(),
      content: html,
      summary: summary
    };
    saveReport(report);
    statusEl.innerHTML = '<span style="color:#3fb950">自选股报告生成成功！</span>';
    setTimeout(() => renderReportsPage(document.getElementById('mainContent')), 1000);
  } catch (e) {
    statusEl.innerHTML = `<span style="color:#f85149">生成失败：${e.message}</span>`;
  }
}

// 下载历史报告详情为 .md 文件
function downloadReportDetail(id) {
  const reports = getReportList();
  const r = reports.find(x => x.id === id);
  if (!r) return;
  const dateStr = r.date || new Date(r.createTime).toISOString().slice(0, 10);
  const raw = r.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
  const md = lines.join('\n\n');
  const blob = new Blob(['# ' + r.title + '\n\n生成时间：' + new Date(r.createTime).toLocaleString('zh-CN') + '\n\n---\n\n' + md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = dateStr + '_' + r.title.replace(/[\\/:*?"<>|]/g, '_') + '.md';
  a.click();
  URL.revokeObjectURL(a.href);
}

// 导出历史报告为PDF
function exportReportPDF(id) {
  const reports = getReportList();
  const r = reports.find(x => x.id === id);
  if (!r) return;
  const dateStr = r.date || new Date(r.createTime).toISOString().slice(0, 10);
  if (typeof printReportToPDF === 'function') {
    printReportToPDF(r.title, r.content);
  } else {
    alert('PDF导出功能不可用');
  }
}
