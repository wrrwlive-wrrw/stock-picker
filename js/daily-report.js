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
  document.getElementById('reportDetailModal').innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.innerHTML=''">
      <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;width:90%;max-width:800px;max-height:80vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="color:#e6e6e6;margin:0">${r.title}</h3>
          <button class="btn btn-sm" style="background:#30363d;color:#e6e6e6" onclick="this.closest('[style*=fixed]').innerHTML=''">关闭</button>
        </div>
        <div style="color:#8b949e;font-size:12px;margin-bottom:12px">生成时间：${new Date(r.createTime).toLocaleString('zh-CN')}</div>
        <div style="color:#c9d1d9;line-height:1.7;font-size:14px">${r.content}</div>
      </div>
    </div>
  `;
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

function buildWatchlistReportPrompt(watchlist, indexData) {
  const idx = indexData || SAMPLE_INDEX;
  let marketStr = '';
  for (const [k, v] of Object.entries(idx)) {
    if (['sh000001','sz399001','sz399006'].includes(k)) {
      marketStr += `${v.name}：${v.value} (${v.pct > 0 ? '+' : ''}${v.pct}%)\n`;
    }
  }
  let stockStr = watchlist.map((s, i) => {
    const pnl = s.addPrice && s.price ? (((parseFloat(s.price) - parseFloat(s.addPrice)) / parseFloat(s.addPrice)) * 100).toFixed(2) + '%' : '未知';
    const methods = (s.methods || []).join('/') || '无';
    return `${i+1}. ${s.name}(${s.code}) | 现价:${s.price||'未知'} | 成本:${s.addPrice||'未知'} | 盈亏:${pnl} | 目标价:${s.targetPrice||'未设'} | 止损价:${s.stopLoss||'未设'} | 选股方法:${methods} | 买入理由:${s.reason||'无'}`;
  }).join('\n');

  return `你是资深A股投研总监，请对以下自选股组合进行今日深度体检分析：

大盘环境（实时数据）：
${marketStr}

自选股列表（含选股方法和盈亏状态）：
${stockStr}

对每只股票必须分析：
1. 当前技术面状态（趋势方向、关键均线位置、支撑/压力位）
2. 资金面判断（主力进出方向、量能变化）
3. 估值水平（PE/PB与行业对比）
4. 风险评估（距止损位距离、潜在风险点、暴雷概率）
5. 明确操作信号：买入/加仓/持有/减仓/清仓（必须给出明确信号，不能含糊）
6. 具体操作价位：买入区间、目标价、止损价

最后给出：
- 组合整体健康度评分（1-100分）
- 调仓建议（哪些该加仓、哪些该减仓、哪些该清仓，给出具体理由）
- 风险预警（哪些股票有暴雷风险）
- 今日操作策略（总仓位建议、攻防配比）

格式：markdown，每只股票用##分段，操作信号加粗标注。限制2500字以内。`;
}

async function callReportAI(apiKey, userPrompt) {
  const resp = await fetch(AI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: '你是一位专业的A股投研分析师，擅长技术分析、基本面分析和市场情绪判断。请提供专业、客观、有数据支撑的分析报告。' },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 8000
    })
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
  const watchlist = JSON.parse(localStorage.getItem('stock_watchlist_' + currentUser.username) || '[]');
  if (watchlist.length > 0) {
    await doGenerateWatchlistReport();
  }
}

async function doGenerateWatchlistReport() {
  const statusEl = document.getElementById('reportGenStatus');
  if (!statusEl) return;
  const apiKey = getAIKey();
  if (!apiKey) { statusEl.innerHTML = '<span style="color:#f85149">请先在"每日分析"页面配置API Key</span>'; return; }

  const watchlist = JSON.parse(localStorage.getItem('stock_watchlist_' + currentUser.username) || '[]');
  if (!watchlist.length) { statusEl.innerHTML = '<span style="color:#f85149">自选股为空，请先添加自选股</span>'; return; }
  statusEl.innerHTML = '⏳ 正在分析自选股组合...';

  try {
    const indexData = await fetchIndexData();
    const prompt = buildWatchlistReportPrompt(watchlist, indexData);
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
