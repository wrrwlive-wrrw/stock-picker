// 每日AI智能分析模块

// AI供应商配置
const AI_PROVIDERS = {
  siliconflow: {
    name: '硅基流动 SiliconFlow',
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'Qwen/Qwen3-32B',
    keyPlaceholder: '粘贴sk-开头的API Key',
    keyHint: '免费申请硅基流动Key',
    keyUrl: 'https://cloud.siliconflow.cn/account/ak'
  },
  zhipu: {
    name: '智谱AI (GLM)',
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'GLM-4-Flash',
    keyPlaceholder: '粘贴智谱API Key',
    keyHint: '免费申请智谱API Key',
    keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys'
  },
  groq: {
    name: 'Groq (Llama/Mixtral)',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    keyPlaceholder: '粘贴gsk_开头的API Key',
    keyHint: '免费申请Groq Key',
    keyUrl: 'https://console.groq.com/keys'
  },
  openrouter: {
    name: 'OpenRouter (多模型)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    keyPlaceholder: '粘贴sk-or-开头的API Key',
    keyHint: '免费申请OpenRouter Key',
    keyUrl: 'https://openrouter.ai/keys'
  },
  bailian: {
    name: '阿里云百炼 (通义千问)',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus',
    keyPlaceholder: '粘贴sk-开头的百炼API Key',
    keyHint: '免费申请百炼Key',
    keyUrl: 'https://bailian.console.aliyun.com/'
  }
};

function getAIProvider() {
  return localStorage.getItem('ai_provider') || 'siliconflow';
}
function setAIProvider(p) {
  localStorage.setItem('ai_provider', p);
}
function getAIConfig() {
  const provider = getAIProvider();
  const cfg = AI_PROVIDERS[provider] || AI_PROVIDERS.siliconflow;
  return { provider, url: cfg.url, model: cfg.model, ...cfg };
}

function getAIKey() {
  return localStorage.getItem('ai_api_key') || '';
}
function saveAIKey(k) {
  localStorage.setItem('ai_api_key', k);
}

// 获取自选股实时行情（批量 - 一次请求获取所有行情）
async function fetchWatchlistQuotes() {
  const key = 'stock_watchlist_' + (currentUser?.username || 'guest');
  let watchlist = [];
  try { watchlist = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  if (!watchlist.length) return { list: [], quotes: {} };
  const quotes = {};
  // 批量拉取所有股票行情（1次请求代替N次）
  const codes = watchlist.map(s => s.code);
  let quotesMap = {};
  try {
    quotesMap = await fetchAStockQuotesBatch(codes);
  } catch(e) { console.warn('批量行情失败', e); }
  watchlist.forEach(s => {
    if (quotesMap[s.code]) quotes[s.code] = quotesMap[s.code];
  });
  // 拉取资金流向（串行，每请求间隔300ms避免代理429限流）
  for (const s of watchlist) {
    try {
      const capData = await fetchEMCapitalFlow(s.code);
      if (capData && capData.length) {
        const latest = capData[capData.length - 1];
        quotes[s.code] = quotes[s.code] || {};
        quotes[s.code].capitalFlow = latest;
        quotes[s.code].capitalTrend = capData.slice(-5);
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 300));
  }
  return { list: watchlist, quotes };
}

// 构建自选股分析数据摘要（注入Prompt）
function buildWatchlistSummary(watchlist, quotes) {
  if (!watchlist.length) return '';
  return watchlist.map((s, i) => {
    const q = quotes[s.code] || {};
    const price = q.price || s.price || '—';
    const pct = q.pct !== undefined ? (q.pct > 0 ? '+' : '') + q.pct + '%' : '未知';
    const pe = q.pe || '—';
    const cap = q.capitalFlow;
    const capStr = cap ? `主力${cap.main > 0 ? '+' : ''}${cap.main.toFixed(2)}亿` : '资金数据未知';
    // 散户资金流向
    const trend = q.capitalTrend || [];
    let retailStr = '散户数据未知';
    if (trend.length >= 2) {
      const recentSmall = trend.slice(-3).reduce((sum, t) => sum + (t.small || 0), 0);
      retailStr = recentSmall > 0 ? `散户净流入${recentSmall.toFixed(2)}亿` : `散户净流出${Math.abs(recentSmall).toFixed(2)}亿`;
    } else if (trend.length === 1) {
      const small = trend[0].small || 0;
      retailStr = small > 0 ? `散户流入${small.toFixed(2)}亿` : `散户流出${Math.abs(small).toFixed(2)}亿`;
    }
    const cost = s.costPrice || s.addPrice || '未知';
    const shares = s.shares || '';
    const target = s.targetPrice || '未设';
    const stop = s.stopLoss || '未设';
    const costNum = parseFloat(s.costPrice || s.addPrice) || 0;
    const curNum = parseFloat(price) || 0;
    const pnl = costNum > 0 ? (((curNum - costNum) / costNum) * 100).toFixed(2) + '%' : '未知';
    // 个人持仓盈亏金额（按股数计算）
    let positionStr = '';
    if (costNum > 0 && curNum > 0) {
      const sharesNum = parseInt(shares) || 0;
      if (sharesNum > 0) {
        const pnlAmount = ((curNum - costNum) * sharesNum).toFixed(2);
        const marketValue = (curNum * sharesNum).toFixed(2);
        const costTotal = (costNum * sharesNum).toFixed(2);
        positionStr = `持仓${sharesNum}股/市值${marketValue}元/成本总额${costTotal}元/浮动盈亏${pnlAmount >= 0 ? '+' : ''}${pnlAmount}元`;
      } else {
        positionStr = `成本${cost}元/盈亏${pnl}`;
      }
    }
    const methods = (s.methods || []).join('/') || '无';
    // 内外盘资金流详情（供AI分析主力出货）
    let inOutDetail = '';
    if (trend.length >= 2) {
      const last3 = trend.slice(-3);
      const bigIn = last3.reduce((s, t) => s + (t.big || 0), 0);
      const superIn = last3.reduce((s, t) => s + (t.super || 0), 0);
      const mainFlow = last3.reduce((s, t) => s + (t.main || 0), 0);
      inOutDetail = `近3日主力累计${mainFlow > 0 ? '+' : ''}${mainFlow.toFixed(2)}亿(大单${bigIn > 0 ? '+' : ''}${bigIn.toFixed(2)}亿/超大单${superIn > 0 ? '+' : ''}${superIn.toFixed(2)}亿)`;
    }
    return `${i+1}. ${s.name}(${s.code}) | 现价:${price} 涨跌:${pct} PE:${pe} | 个人持仓：${positionStr || '成本:'+cost+' 盈亏:'+pnl} | 目标:${target} 止损:${stop} | ${capStr} | ${retailStr} | ${inOutDetail} | 选股方法:${methods}`;
  }).join('\n');
}

function renderDailyAI(el) {
  stopAutoRefresh();
  const today = new Date().toISOString().slice(0, 10);
  const cached = getDailyCache(today);
  const savedKey = getAIKey();
  const keyMask = savedKey ? savedKey.slice(0,6)+'****'+savedKey.slice(-4) : '未配置';
  const cfg = getAIConfig();
  el.innerHTML = `
    <div class="card">
      <div class="card-title">🤖 每日智能分析</div>
      <p style="color:#8b949e;font-size:13px">AI自动分析大盘走势、自选股风险、买卖信号，推荐20只主线股票</p>
      <div style="margin-top:8px;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:4px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
          <span style="font-size:12px;color:#8b949e">AI供应商：</span>
          <select id="aiProviderSelect" onchange="switchAIProvider()" style="padding:5px 8px;background:#161b22;border:1px solid #30363d;color:#e6e6e6;border-radius:4px;font-size:12px">
            <option value="siliconflow" ${getAIProvider()==='siliconflow'?'selected':''}>硅基流动 (Qwen3-32B)</option>
            <option value="bailian" ${getAIProvider()==='bailian'?'selected':''}>阿里云百炼 (通义千问)</option>
            <option value="zhipu" ${getAIProvider()==='zhipu'?'selected':''}>智谱AI (GLM-4-Flash)</option>
            <option value="groq" ${getAIProvider()==='groq'?'selected':''}>Groq (Llama-3.3-70B)</option>
            <option value="openrouter" ${getAIProvider()==='openrouter'?'selected':''}>OpenRouter (多模型免费)</option>
          </select>
        </div>
        <div style="font-size:12px;color:#8b949e;margin-bottom:6px">
          当前：<span style="color:#58a6ff">${cfg.name}</span> | Key：<span style="color:#58a6ff">${keyMask}</span>
          （<a href="${cfg.keyUrl}" target="_blank" style="color:#58a6ff">${cfg.keyHint}</a>）
        </div>
        <div style="display:flex;gap:6px">
          <input type="password" id="aiKeyInput" placeholder="${cfg.keyPlaceholder}" style="flex:1;padding:6px;background:#161b22;border:1px solid #30363d;color:#e6e6e6;border-radius:4px;font-size:12px">
          <button class="btn btn-blue btn-sm" onclick="setAIKey()">保存Key</button>
          <button class="btn btn-sm" style="background:#f0883e;color:#fff" onclick="testAIConnection()">测试连接</button>
        </div>
        <div id="aiTestResult" style="margin-top:6px;font-size:12px"></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="generateDailyAnalysis()" id="aiBtn">生成今日分析</button>
        <button class="btn btn-blue" onclick="showFallbackNow()">查看离线示例</button>
        <span style="font-size:12px;color:#8b949e;line-height:32px" id="aiStatus">${cached ? '今日已生成，可重新生成' : (savedKey ? '点击按钮开始分析' : '未配置API Key，将显示离线分析')}</span>
      </div>
    </div>
    <div id="autoRefreshBar" style="padding:6px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;font-size:12px">
      <span style="color:#8b949e">📡 实时信号监控：<span id="refreshStatus" style="color:#16c784">运行中</span></span>
      <span style="color:#8b949e"><span id="lastRefreshTime">--</span> 更新 | 下次：<span id="nextRefreshCountdown">--</span></span>
    </div>
    <div id="marketOverviewArea"></div>
    <div id="watchlistSignalArea"></div>
    <div id="dailyResult">${cached ? cached : ''}</div>
  `;
  loadMarketOverview();
  loadWatchlistSignals();
  startAutoRefresh();
}

function switchAIProvider() {
  const sel = document.getElementById('aiProviderSelect');
  if (!sel) return;
  setAIProvider(sel.value);
  renderDailyAI(document.getElementById('mainContent'));
}

// === 自动刷新引擎 ===
let _autoRefreshHourTimer = null;   // 每小时全量刷新
let _autoRefreshQuickTimer = null;  // 每5分钟轻量检测
let _autoRefreshCountdown = null;   // 倒计时更新
let _lastSignalSnapshot = null;     // 上次信号快照，用于对比变化
let _refreshHourMs = 3600000;       // 1小时
let _quickCheckMs = 300000;         // 5分钟

function startAutoRefresh() {
  stopAutoRefresh();
  updateRefreshUI();
  // 每小时全量刷新
  _autoRefreshHourTimer = setInterval(() => {
    doFullRefresh('定时全量刷新');
  }, _refreshHourMs);
  // 每5分钟轻量检测（仅拉取行情，检测是否有重大变化）
  _autoRefreshQuickTimer = setInterval(() => {
    quickCheckForMajorEvent();
  }, _quickCheckMs);
  // 倒计时更新
  _autoRefreshCountdown = setInterval(updateRefreshUI, 1000);
  // 记录启动时间
  _autoRefreshStartTime = Date.now();
  _autoRefreshNextHour = Date.now() + _refreshHourMs;
  updateRefreshUI();
}

function stopAutoRefresh() {
  if (_autoRefreshHourTimer) { clearInterval(_autoRefreshHourTimer); _autoRefreshHourTimer = null; }
  if (_autoRefreshQuickTimer) { clearInterval(_autoRefreshQuickTimer); _autoRefreshQuickTimer = null; }
  if (_autoRefreshCountdown) { clearInterval(_autoRefreshCountdown); _autoRefreshCountdown = null; }
}

let _autoRefreshStartTime = 0;
let _autoRefreshNextHour = 0;

function updateRefreshUI() {
  const statusEl = document.getElementById('refreshStatus');
  const lastEl = document.getElementById('lastRefreshTime');
  const nextEl = document.getElementById('nextRefreshCountdown');
  if (!statusEl) return;
  const now = Date.now();
  const lastTime = new Date(_autoRefreshStartTime).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
  if (lastEl) lastEl.textContent = lastTime;
  const remaining = Math.max(0, _autoRefreshNextHour - now);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  if (nextEl) nextEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
}

async function doFullRefresh(reason) {
  const statusEl = document.getElementById('refreshStatus');
  if (statusEl) { statusEl.textContent = `刷新中(${reason})...`; statusEl.style.color = '#d29922'; }
  try {
    await Promise.all([loadMarketOverview(), loadWatchlistSignals()]);
    if (statusEl) { statusEl.textContent = '运行中'; statusEl.style.color = '#16c784'; }
  } catch(e) {
    console.error('自动刷新失败', e);
    if (statusEl) { statusEl.textContent = '刷新失败'; statusEl.style.color = '#ea3943'; }
  }
  _autoRefreshNextHour = Date.now() + _refreshHourMs;
  updateRefreshUI();
}

// 轻量检测：只拉取最新行情，检测重大变化
async function quickCheckForMajorEvent() {
  try {
    const { list, quotes } = await fetchWatchlistQuotes();
    if (!list.length) return;
    let hasMajorEvent = false;
    const reasons = [];
    for (const s of list) {
      const q = quotes[s.code] || {};
      const pct = parseFloat(q.pct) || 0;
      const cap = q.capitalFlow;
      // 大幅波动：涨跌幅超5%
      if (Math.abs(pct) >= 5) {
        hasMajorEvent = true;
        reasons.push(`${s.name} 涨跌${pct}%`);
      }
      // 主力资金大幅流出：单日流出超2亿
      if (cap && cap.main < -2) {
        hasMajorEvent = true;
        reasons.push(`${s.name} 主力流出${cap.main.toFixed(1)}亿`);
      }
      // 主力资金大幅流入：单日流入超2亿
      if (cap && cap.main > 2) {
        hasMajorEvent = true;
        reasons.push(`${s.name} 主力流入${cap.main.toFixed(1)}亿`);
      }
    }
    // 尾盘半小时检测
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const isTailEnd = (h === 14 && m >= 30) || (h === 15 && m === 0);
    if (isTailEnd) {
      const tailResults = await detectTailEndSelling(list);
      const criticalTail = tailResults.filter(r => r.level === 'critical');
      if (criticalTail.length) {
        hasMajorEvent = true;
        reasons.push(criticalTail.map(r => `${r.name} 尾盘砸盘`).join('; '));
      }
    }
    if (hasMajorEvent) {
      console.log('🚨 检测到重大事件，触发即时刷新:', reasons.join('; '));
      doFullRefresh('重大事件:' + reasons[0]);
    }
  } catch(e) {
    console.warn('快速检测失败', e);
  }
}

// 加载大盘实时概览
async function loadMarketOverview() {
  const area = document.getElementById('marketOverviewArea');
  if (!area) return;
  try {
    const snapshot = await fetchMarketSnapshot();
    if (!snapshot) { area.innerHTML = ''; return; }
    const shCls = parseFloat(snapshot.sh.pct) >= 0 ? 'up' : 'down';
    const szCls = parseFloat(snapshot.sz.pct) >= 0 ? 'up' : 'down';
    const cybCls = parseFloat(snapshot.cyb.pct) >= 0 ? 'up' : 'down';
    area.innerHTML = `<div class="card" style="border-left:3px solid #58a6ff">
      <div class="card-title">📊 今日大盘实时概览</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px">
        <div style="flex:1;min-width:200px;padding:10px;background:#0d1117;border-radius:6px;border:1px solid #30363d">
          <div style="font-size:12px;color:#8b949e">上证指数</div>
          <div style="font-size:20px;font-weight:700;color:#e6e6e6">${snapshot.sh.price}</div>
          <div class="${shCls}" style="font-size:14px;font-weight:600">${parseFloat(snapshot.sh.pct)>=0?'+':''}${snapshot.sh.pct}%</div>
        </div>
        <div style="flex:1;min-width:200px;padding:10px;background:#0d1117;border-radius:6px;border:1px solid #30363d">
          <div style="font-size:12px;color:#8b949e">深证成指</div>
          <div style="font-size:20px;font-weight:700;color:#e6e6e6">${snapshot.sz.price}</div>
          <div class="${szCls}" style="font-size:14px;font-weight:600">${parseFloat(snapshot.sz.pct)>=0?'+':''}${snapshot.sz.pct}%</div>
        </div>
        <div style="flex:1;min-width:200px;padding:10px;background:#0d1117;border-radius:6px;border:1px solid #30363d">
          <div style="font-size:12px;color:#8b949e">创业板指</div>
          <div style="font-size:20px;font-weight:700;color:#e6e6e6">${snapshot.cyb.price}</div>
          <div class="${cybCls}" style="font-size:14px;font-weight:600">${parseFloat(snapshot.cyb.pct)>=0?'+':''}${snapshot.cyb.pct}%</div>
        </div>
      </div>
    </div>`;
  } catch(e) { area.innerHTML = ''; }
}

// === 尾盘半小时大单检测 ===
async function detectTailEndSelling(watchlist) {
  const results = [];
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  // 只在交易时间段检测（9:30-15:00）
  const isTradingTime = (hour === 9 && minute >= 30) || (hour >= 10 && hour < 14) || (hour === 14 && minute <= 59) || (hour === 15 && minute === 0);
  if (!isTradingTime) return results;

  const isTailEnd = (hour === 14 && minute >= 30) || (hour === 15 && minute === 0);
  
  for (const s of watchlist.slice(0, 10)) {
    try {
      const intraday = await fetchEMIntradayFlow(s.code);
      if (!intraday || !intraday.length) continue;
      // 筛选14:30-15:00的数据
      const tailData = intraday.filter(d => {
        const t = d.time;
        if (!t) return false;
        const parts = t.split(':');
        if (parts.length < 2) return false;
        const h = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        return (h === 14 && m >= 30) || (h === 15 && m === 0);
      });
      if (!tailData.length) continue;
      // 计算尾盘主力净流入
      const tailMainNet = tailData.reduce((sum, d) => sum + (d.main || 0), 0);
      const tailBigNet = tailData.reduce((sum, d) => sum + (d.big || 0) + (d.super || 0), 0);
      const tailSmallNet = tailData.reduce((sum, d) => sum + (d.small || 0), 0);
      // 尾盘大单集中度 = 大单/超大单占总净流入的比例
      const tailTotalNet = Math.abs(tailMainNet) + Math.abs(tailSmallNet);
      const bigRatio = tailTotalNet > 0 ? Math.abs(tailBigNet) / tailTotalNet : 0;
      
      let signal = '';
      let level = 'normal';
      // 尾盘大单集中抛售：主力大幅流出 + 大单占比高
      if (tailMainNet < -50 && bigRatio > 0.6) {
        signal = `尾盘大单砸盘：主力流出${(tailMainNet/10000).toFixed(2)}亿，大单占比${(bigRatio*100).toFixed(0)}%`;
        level = 'critical';
      }
      // 尾盘主力持续流出
      else if (tailMainNet < -20) {
        signal = `尾盘主力流出${(tailMainNet/10000).toFixed(2)}亿`;
        level = 'warning';
      }
      // 尾盘散户抛售，主力接盘
      else if (tailSmallNet < -30 && tailMainNet > 20) {
        signal = `尾盘散户抛售${(Math.abs(tailSmallNet)/10000).toFixed(2)}亿，主力接盘`;
        level = 'info';
      }
      // 尾盘急速拉升（可能是诱多）
      else if (tailMainNet > 50 && tailSmallNet < -30) {
        signal = `尾盘主力拉升${(tailMainNet/10000).toFixed(2)}亿，散户出逃，警惕诱多`;
        level = 'warning';
      }
      
      if (signal) {
        results.push({ code: s.code, name: s.name, signal, level, tailMainNet, tailBigNet, tailSmallNet });
      }
    } catch(e) { console.warn('尾盘检测失败', s.name, e); }
  }
  return results;
}

// 将尾盘检测结果注入Prompt
function buildTailEndSummary(tailResults) {
  if (!tailResults || !tailResults.length) return '';
  const lines = tailResults.map(r => {
    const levelIcon = r.level === 'critical' ? '🔴' : r.level === 'warning' ? '🟠' : 'ℹ️';
    return `${levelIcon} ${r.name}(${r.code})：${r.signal}`;
  });
  return `\n## ⚠️ 尾盘半小时异动检测（14:30-15:00）\n${lines.join('\n')}\n\n对以上尾盘异动必须分析：\n1. 是否存在大资金砸盘收尾\n2. 尾盘异动对次日走势的影响\n3. 是否需要在收盘前减仓\n`;
}

// === 早盘核心多空资金流向检测（9:30-11:30）===
async function detectEarlySessionFlow(watchlist) {
  const results = [];
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const isAfterMorning = h > 11 || (h === 11 && m >= 30);
  if (!isAfterMorning) return results;
  for (const s of watchlist.slice(0, 10)) {
    try {
      const intraday = await fetchEMIntradayFlow(s.code);
      if (!intraday || !intraday.length) continue;
      const morning = intraday.filter(d => {
        if (!d.time) return false;
        const p = d.time.split(':');
        if (p.length < 2) return false;
        const dh = parseInt(p[0]), dm = parseInt(p[1]);
        return (dh === 9 && dm >= 30) || dh === 10 || (dh === 11 && dm <= 30);
      });
      if (!morning.length) continue;
      const net = morning.reduce((s, d) => s + (d.main || 0), 0);
      const big = morning.reduce((s, d) => s + (d.big || 0) + (d.super || 0), 0);
      const small = morning.reduce((s, d) => s + (d.small || 0), 0);
      let signal = '', level = 'normal';
      if (net < -200) { signal = `早盘主力大幅流出${(net/10000).toFixed(2)}亿，大单${big>0?'流入':'流出'}${(Math.abs(big)/10000).toFixed(2)}亿`; level = 'critical'; }
      else if (net < -100) { signal = `早盘主力流出${(net/10000).toFixed(2)}亿`; level = 'warning'; }
      else if (net > 200) { signal = `早盘主力大幅流入${(net/10000).toFixed(2)}亿`; level = 'positive'; }
      if (signal) results.push({ code: s.code, name: s.name, signal, level, main: net, big, small });
    } catch(e) {}
  }
  return results;
}

// === 尾盘集合竞价检测（14:57-15:00）===
async function detectClosingAuction(watchlist) {
  const results = [];
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  if (h < 14 || (h === 14 && m < 57) || h > 15) return results;
  for (const s of watchlist.slice(0, 10)) {
    try {
      const intraday = await fetchEMIntradayFlow(s.code);
      if (!intraday || !intraday.length) continue;
      const auction = intraday.filter(d => {
        if (!d.time) return false;
        const p = d.time.split(':');
        if (p.length < 2) return false;
        const dh = parseInt(p[0]), dm = parseInt(p[1]);
        return (dh === 14 && dm >= 57) || (dh === 15 && dm === 0);
      });
      if (!auction.length) continue;
      const net = auction.reduce((s, d) => s + (d.main || 0), 0);
      const big = auction.reduce((s, d) => s + (d.big || 0) + (d.super || 0), 0);
      const small = auction.reduce((s, d) => s + (d.small || 0), 0);
      const totalAbs = Math.abs(net) + Math.abs(small);
      const bigRatio = totalAbs > 0 ? Math.abs(big) / totalAbs : 0;
      let signal = '', level = 'normal';
      if (net < -50 && bigRatio > 0.7) {
        signal = `集合竞价大资金不计成本砸盘：主力流出${(net/10000).toFixed(2)}亿，大单占比${(bigRatio*100).toFixed(0)}%`;
        level = 'critical';
      } else if (net < -20) { signal = `集合竞价主力流出${(net/10000).toFixed(2)}亿`; level = 'warning'; }
      else if (net > 50 && small < -20) { signal = `集合竞价主力拉抬${(net/10000).toFixed(2)}亿，可能是诱多`; level = 'warning'; }
      if (signal) results.push({ code: s.code, name: s.name, signal, level });
    } catch(e) {}
  }
  return results;
}

// 构建早盘资金流摘要
function buildEarlyFlowSummary(earlyResults) {
  if (!earlyResults || !earlyResults.length) return '';
  return `\n## ☀️ 早盘主力资金流向检测（9:30-11:30）\n${earlyResults.map(r => {
    const icon = r.level === 'critical' ? '🔴' : r.level === 'warning' ? '🟠' : r.level === 'positive' ? '🟢' : 'ℹ️';
    return `${icon} ${r.name}(${r.code})：${r.signal}`;
  }).join('\n')}\n\n对以上早盘异动分析：\n1. 早盘主力大幅流出的是否午后有反转可能\n2. 早盘拉高是否为主力出货掩护\n3. 午后操作策略调整建议\n`;
}

// 构建集合竞价摘要
function buildAuctionSummary(auctionResults) {
  if (!auctionResults || !auctionResults.length) return '';
  return `\n## 🏁 尾盘集合竞价监测（14:57-15:00）\n${auctionResults.map(r => {
    const icon = r.level === 'critical' ? '🔴' : r.level === 'warning' ? '🟠' : 'ℹ️';
    return `${icon} ${r.name}(${r.code})：${r.signal}`;
  }).join('\n')}\n\n对以上集合竞价分析：\n1. 是否存在大资金不计成本砸盘收尾\n2. 集合竞价异动对次日开盘的影响\n3. 是否需调整收盘仓位\n`;
}

// 加载自选股实时信号
async function loadWatchlistSignals() {
  const area = document.getElementById('watchlistSignalArea');
  if (!area) return;
  try {
    const { list, quotes } = await fetchWatchlistQuotes();
    if (!list.length) { area.innerHTML = ''; return; }
    const marketCtx = await getMarketContext();
    const evaluations = list.map(s => {
      const q = quotes[s.code] || {};
      const enrichedStock = { ...s, price: q.price || s.price };
      const capFlow = q.capitalTrend || [];
      const latestCap = q.capitalFlow || null;
      const rtData = { capitalFlow: latestCap, turnover: q.volume || null };
      const ev = evaluateWatchStock(enrichedStock, marketCtx, rtData);
      // 主力出货风险评估（用近5日资金流趋势）
      const mfRisk = assessMainForceRisk(capFlow, parseFloat(q.price) || 0, parseFloat(q.pct) || 0, parseFloat(q.volume) || 0);
      return { stock: s, quote: q, evaluation: ev, mfRisk };
    });
    // 按主力出货风险+信号综合排序
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sigOrder = { sell: 0, reduce: 1, hold: 2, buy: 3 };
    evaluations.sort((a, b) => {
      const ra = riskOrder[a.mfRisk.level] ?? 3;
      const rb = riskOrder[b.mfRisk.level] ?? 3;
      if (ra !== rb) return ra - rb;
      return (sigOrder[a.evaluation.signal] || 2) - (sigOrder[b.evaluation.signal] || 2);
    });
    // 尾盘半小时检测
    const tailResults = await detectTailEndSelling(list);
    const tailMap = {};
    tailResults.forEach(r => { tailMap[r.code] = r; });
    // 早盘核心多空资金流向检测
    const earlyResults = await detectEarlySessionFlow(list);
    const earlyMap = {};
    earlyResults.forEach(r => { earlyMap[r.code] = r; });
    // 尾盘集合竞价检测
    const auctionResults = await detectClosingAuction(list);
    const auctionMap = {};
    auctionResults.forEach(r => { auctionMap[r.code] = r; });
    const sigMap = { sell: '🔴 清仓', reduce: '🟠 减仓', hold: '🟡 持有', buy: '🟢 买入' };
    const sigCls = { sell: 'down', reduce: 'down', hold: 'flat', buy: 'up' };
    const bgMap = { sell: '#2d0a0a', reduce: '#2d1f0a', hold: '#0d1117', buy: '#0a2d1a' };
    const mfBg = { critical: '#3d0a0a', high: '#2d1a0a', medium: '#1a1a0a', low: '#0d1117' };
    const mfLabel = { critical: '🔴 出货', high: '🟠 疑似', medium: '🟡 关注', low: '🟢 安全' };
    const mfCls = { critical: 'down', high: 'down', medium: 'flat', low: 'up' };
    // 收集所有失效场景
    const allFailures = evaluations.flatMap(e => e.mfRisk.failureScenarios.map(f => ({ ...f, stock: e.stock.name })));
    area.innerHTML = `<div class="card" style="border-left:3px solid #f0883e">
      <div class="card-title">⚡ 自选股实时信号（${list.length}只）</div>
      <div style="font-size:12px;color:#8b949e;margin-bottom:8px">大盘环境：<span style="color:${marketCtx.color}">${marketCtx.desc}</span></div>
      <div style="overflow-x:auto"><table class="data-table" style="font-size:12px">
        <tr><th>股票</th><th>现价</th><th>涨跌</th><th>持仓</th><th>信号</th><th>主力资金</th><th>主力出货</th><th>成交量</th><th>操作建议</th></tr>
        ${evaluations.map(({stock:s, quote:q, evaluation:ev, mfRisk}) => {
          const pct = q.pct !== undefined ? q.pct : '—';
          const pctCls = parseFloat(pct) >= 0 ? 'up' : 'down';
          const cap = ev.capital || {};
          const mainStr = cap.main || '—';
          const mainCls = (typeof mainStr === 'string' && mainStr.startsWith('+')) ? 'up' : 'down';
          // 持仓盈亏
          const costNum = parseFloat(s.costPrice || s.addPrice) || 0;
          const curNum = parseFloat(q.price) || 0;
          const sharesNum = parseInt(s.shares) || 0;
          let posStr = '—';
          let posCls = 'flat';
          if (costNum > 0 && curNum > 0) {
            const pnlPct = ((curNum - costNum) / costNum * 100).toFixed(1);
            posCls = parseFloat(pnlPct) >= 0 ? 'up' : 'down';
            if (sharesNum > 0) {
              const pnlAmt = ((curNum - costNum) * sharesNum).toFixed(0);
              posStr = `${pnlPct >= 0 ? '+' : ''}${pnlPct}%(${pnlAmt >= 0 ? '+' : ''}${pnlAmt}元)`;
            } else {
              posStr = `${pnlPct >= 0 ? '+' : ''}${pnlPct}%`;
            }
          }
          // 主力出货风险
          const mfStr = mfRisk.label;
          const mfClsVal = mfCls[mfRisk.level] || 'flat';
          const mfDetail = mfRisk.inOutSignals.length ? mfRisk.inOutSignals[0] : '暂无出货信号';
          // 成交量异动
          const volStr = mfRisk.volumeDesc || '正常';
          const volCls = mfRisk.level === 'critical' ? 'down' : mfRisk.level === 'high' ? 'down' : 'flat';
          // 失效场景
          const failures = mfRisk.failureScenarios;
          const failBadge = failures.length ? `<div style="font-size:9px;color:#f0883e">${failures.map(f=>f.name).join('/')}</div>` : '';
          // 尾盘异动
          const tail = tailMap[s.code];
          const tailBadge = tail ? `<div style="font-size:9px;color:${tail.level==='critical'?'#ea3943':tail.level==='warning'?'#f0883e':'#58a6ff'};margin-top:2px" title="${tail.signal.replace(/"/g,'&quot;')}">尾盘${tail.level==='critical'?'🔴砸盘':tail.level==='warning'?'🟠异动':'🔵关注'}</div>` : '';
          // 早盘资金流向
          const early = earlyMap[s.code];
          const earlyBadge = early ? `<div style="font-size:9px;color:${early.level==='critical'?'#ea3943':early.level==='warning'?'#f0883e':early.level==='positive'?'#3fb950':'#58a6ff'};margin-top:2px" title="${early.signal.replace(/"/g,'&quot;')}">早盘${early.level==='critical'?'🔴主力出逃':early.level==='warning'?'🟠资金流出':early.level==='positive'?'🟢资金流入':'🔵关注'}</div>` : '';
          // 集合竞价
          const auction = auctionMap[s.code];
          const auctionBadge = auction ? `<div style="font-size:9px;color:${auction.level==='critical'?'#ea3943':'#f0883e'};margin-top:2px" title="${auction.signal.replace(/"/g,'&quot;')}">集合竞价${auction.level==='critical'?'🔴砸盘':'🟠异动'}</div>` : '';
          return `<tr style="background:${mfBg[mfRisk.level] || bgMap[ev.signal] || '#0d1117'}">
            <td><b>${s.name}</b><div style="font-size:10px;color:#8b949e">${s.code}</div>${tailBadge}${earlyBadge}${auctionBadge}</td>
            <td>${q.price || s.price || '—'}</td>
            <td class="${pctCls}">${pct !== '—' ? (parseFloat(pct)>=0?'+':'') + pct + '%' : '—'}</td>
            <td class="${posCls}" style="font-size:11px;font-weight:600">${posStr}</td>
            <td class="${sigCls[ev.signal]||'flat'}" style="font-weight:700">${sigMap[ev.signal]||'持有'}</td>
            <td class="${mainCls}">${mainStr}</td>
            <td class="${mfClsVal}" style="font-size:11px">${mfStr}<div style="font-size:9px;color:#8b949e;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${mfDetail.replace(/"/g,'&quot;')}">${mfDetail}</div>${failBadge}</td>
            <td class="${volCls}" style="font-size:10px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${volStr.replace(/"/g,'&quot;')}">${volStr.length > 15 ? volStr.slice(0,15) + '...' : volStr}</td>
            <td style="font-size:11px">${ev.tradeAction}</td>
          </tr>`;
        }).join('')}
      </table></div>
      ${allFailures.length ? `<div style="margin-top:8px;padding:8px;background:#2d1a0a;border:1px solid #f0883e;border-radius:6px;font-size:11px">
        <div style="color:#f0883e;font-weight:700;margin-bottom:4px">⚠️ 失效场景预警（${allFailures.length}只触发）</div>
        ${allFailures.map(f => `<div style="color:#d29922">• <b>${f.stock}</b>：${f.name} — ${f.desc}</div>`).join('')}
      </div>` : ''}
      ${tailResults.length ? `<div style="margin-top:8px;padding:8px;background:#1a0d2d;border:1px solid #a371f7;border-radius:6px;font-size:11px">
        <div style="color:#a371f7;font-weight:700;margin-bottom:4px">🕐 尾盘半小时异动（14:30-15:00）</div>
        ${tailResults.map(r => `<div style="color:${r.level==='critical'?'#ea3943':r.level==='warning'?'#f0883e':'#58a6ff'};margin-bottom:2px">• <b>${r.name}</b>：${r.signal}</div>`).join('')}
      </div>` : ''}
      ${earlyResults.length ? `<div style="margin-top:8px;padding:8px;background:#0d1a2d;border:1px solid #58a6ff;border-radius:6px;font-size:11px">
        <div style="color:#58a6ff;font-weight:700;margin-bottom:4px">☀️ 早盘核心多空资金流向（9:30-11:30）</div>
        ${earlyResults.map(r => `<div style="color:${r.level==='critical'?'#ea3943':r.level==='warning'?'#f0883e':r.level==='positive'?'#3fb950':'#58a6ff'};margin-bottom:2px">• <b>${r.name}</b>：${r.signal}</div>`).join('')}
      </div>` : ''}
      ${auctionResults.length ? `<div style="margin-top:8px;padding:8px;background:#2d1a0d;border:1px solid #f0883e;border-radius:6px;font-size:11px">
        <div style="color:#f0883e;font-weight:700;margin-bottom:4px">🏁 尾盘集合竞价监测（14:57-15:00）</div>
        ${auctionResults.map(r => `<div style="color:${r.level==='critical'?'#ea3943':'#f0883e'};margin-bottom:2px">• <b>${r.name}</b>：${r.signal}</div>`).join('')}
      </div>` : ''}
      <div class="tip-box" style="margin-top:8px;font-size:11px">
        <b>信号说明：</b>🔴清仓(卖出分≥80) | 🟠减仓(≥40) | 🟡持有 | 🟢买入(买入分≥70)<br>
        <b>主力出货：</b>🔴出货(风险分≥50) | 🟠疑似(≥30) | 🟡关注 | 🟢安全<br>
        <b>成交量：</b>天量天价/放量滞涨/缩量阴跌/底部放量<br>
        <b>尾盘异动：</b>🔴砸盘(主力流出>5000万) | 🟠异动(>2000万) | 🔵关注<br>
        <b>早盘资金：</b>🔴主力出逃(早盘流出>2亿) | 🟠资金流出(>1亿) | 🟢资金流入(>2亿)<br>
        <b>集合竞价：</b>🔴砸盘(主力流出>5000万+大单占比>70%) | 🟠异动<br>
        <b>失效场景：</b>系统性暴跌 | 黑天鹅事件 | 疑似洗盘（技术分析可能失效）
      </div>
    </div>`;
  } catch(e) {
    console.error('loadWatchlistSignals error', e);
    area.innerHTML = '';
  }
}

function setAIKey() {
  const v = document.getElementById('aiKeyInput').value.trim();
  if (!v) { alert('请输入API Key'); return; }
  const provider = getAIProvider();
  const keyPatterns = {
    siliconflow: /^sk-/,
    zhipu: /^.+/,
    groq: /^gsk_/,
    openrouter: /^sk-or-/
  };
  const pattern = keyPatterns[provider];
  if (pattern && !pattern.test(v)) {
    const hints = {
      siliconflow: '硅基流动Key应以sk-开头',
      groq: 'Groq Key应以gsk_开头',
      openrouter: 'OpenRouter Key应以sk-or-开头'
    };
    alert(hints[provider] || 'API Key格式不正确');
    return;
  }
  saveAIKey(v);
  if (typeof autoBackupUserData === 'function') autoBackupUserData();
  alert('API Key已保存');
  renderDailyAI(document.getElementById('mainContent'));
}

// 测试AI连接
async function testAIConnection() {
  const resultEl = document.getElementById('aiTestResult');
  if (!resultEl) return;
  const inputEl = document.getElementById('aiKeyInput');
  const key = (inputEl?.value || '').trim() || getAIKey();
  if (!key) { resultEl.innerHTML = '<span style="color:#ea3943">请先输入或保存API Key</span>'; return; }
  const cfg = getAIConfig();
  resultEl.innerHTML = `<span style="color:#d29922">⏳ 正在测试 ${cfg.name} 连接...</span>`;
  const startTime = Date.now();
  try {
    const body = {
      model: cfg.model,
      messages: [{ role: 'user', content: '回复"OK"' }],
      max_tokens: 10
    };
    if (getAIProvider() === 'siliconflow') body.enable_thinking = false;
    const resp = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    const elapsed = Date.now() - startTime;
    if (resp.ok) {
      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || {};
      resultEl.innerHTML = `<span style="color:#16c784">✅ 连接成功 (${elapsed}ms)</span> — 模型: <span style="color:#58a6ff">${cfg.model}</span> | 回复: "${reply.slice(0,30)}" ${usage.total_tokens ? '| Token消耗: '+usage.total_tokens : ''}`;
    } else {
      const errText = await resp.text().catch(() => '');
      let errMsg = `HTTP ${resp.status}`;
      if (resp.status === 401) errMsg = 'API Key无效或已过期';
      else if (resp.status === 429) errMsg = '请求频率超限，请稍后重试';
      else if (resp.status === 403) errMsg = 'API Key权限不足';
      else if (resp.status === 404) errMsg = '模型不存在，请检查供应商选择';
      resultEl.innerHTML = `<span style="color:#ea3943">❌ 连接失败: ${errMsg}</span>${errText ? '<br><span style="color:#8b949e;font-size:11px">'+errText.slice(0,120)+'</span>' : ''}`;
    }
  } catch(e) {
    const elapsed = Date.now() - startTime;
    let errMsg = e.message || '未知错误';
    if (e.name === 'TimeoutError') errMsg = '连接超时(15s)，请检查网络或代理';
    else if (e.name === 'TypeError') errMsg = '网络错误，可能存在CORS限制';
    resultEl.innerHTML = `<span style="color:#ea3943">❌ 连接失败 (${elapsed}ms): ${errMsg}</span>`;
  }
}

function showFallbackNow() {
  document.getElementById('dailyResult').innerHTML = getFallbackAnalysis();
  document.getElementById('aiStatus').textContent = '已显示离线示例数据';
}

function getDailyCache(date) {
  return localStorage.getItem('stock_daily_' + date) || '';
}

function saveDailyCache(date, html) {
  localStorage.setItem('stock_daily_' + date, html);
}

async function generateDailyAnalysis() {
  const btn = document.getElementById('aiBtn');
  const status = document.getElementById('aiStatus');
  const result = document.getElementById('dailyResult');
  const apiKey = getAIKey();

  if (!apiKey) {
    result.innerHTML = getFallbackAnalysis();
    status.textContent = '未配置API Key，显示离线示例分析';
    return;
  }

  btn.disabled = true;
  status.textContent = 'AI分析中，请稍候...';
  result.innerHTML = '<div class="card"><p style="color:#58a6ff">正在调用AI分析引擎...</p></div>';

  const today = new Date().toLocaleDateString('zh-CN');
  // 拉取大盘数据 + 自选股实时行情
  status.textContent = '拉取实时大盘数据...';
  const marketSnapshot = await fetchMarketSnapshot();
  status.textContent = '拉取自选股实时行情...';
  const { list: watchlist, quotes } = await fetchWatchlistQuotes();
  const watchlistSummary = buildWatchlistSummary(watchlist, quotes);
  status.textContent = '检测尾盘半小时异动...';
  const tailResults = await detectTailEndSelling(watchlist);
  const tailSummary = buildTailEndSummary(tailResults);
  status.textContent = '检测早盘核心资金流向...';
  const earlyResults = await detectEarlySessionFlow(watchlist);
  const earlySummary = buildEarlyFlowSummary(earlyResults);
  status.textContent = '检测尾盘集合竞价...';
  const auctionResults = await detectClosingAuction(watchlist);
  const auctionSummary = buildAuctionSummary(auctionResults);
  status.textContent = 'AI深度分析中（含自选股+大盘+尾盘+早盘+集合竞价数据）...';
  const prompt = buildDailyPrompt(today, marketSnapshot, watchlistSummary + tailSummary + earlySummary + auctionSummary, watchlist.length);

  try {
    const aiCfg = getAIConfig();
    status.textContent = `使用 ${aiCfg.name} 分析中...`;
    const body = {
      model: aiCfg.model, temperature: 0.4, max_tokens: 6000,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: prompt }
      ]
    };
    // 只有硅基流动支持enable_thinking
    if (getAIProvider() === 'siliconflow') body.enable_thinking = false;
    const res = await fetch(aiCfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = '状态码 ' + res.status;
      if (res.status === 401) errMsg = 'API Key无效或已过期，请重新配置';
      else if (res.status === 429) errMsg = '调用频率超限，请稍后再试';
      else if (res.status === 403) errMsg = 'API Key权限不足或余额不足';
      throw new Error(errMsg + ' — ' + errText.slice(0,120));
    }
    const data = await res.json();
    let text = data.choices?.[0]?.message?.content || '';
    // 清理思考标签和特殊token
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
    text = text.replace(/<think>[\s\S]*/g, '');
    if (text.includes('</think>')) text = text.split('</think>').pop();
    text = text.replace(/<\/?think>/g, '');
    text = text.replace(/<\|.*?\|>/g, '');
    text = text.replace(/^[\s\n]*/, '').trim();
    if (!text) throw new Error('AI返回内容为空');
    const html = formatAIResult(text);
    result.innerHTML = html;
    saveDailyCache(new Date().toISOString().slice(0,10), html);
    status.textContent = '分析完成';
  } catch(e) {
    console.error('AI分析失败', e);
    result.innerHTML = `<div class="card" style="border-color:#da3633">
      <div class="card-title" style="color:#ea3943">⚠️ AI调用失败</div>
      <p style="color:#ea3943;font-size:13px">${e.message || e}</p>
      <p style="color:#8b949e;font-size:12px;margin-top:8px">已切换到离线示例分析：</p>
    </div>` + getFallbackAnalysis();
    status.textContent = 'API调用失败，显示离线分析';
  }
  btn.disabled = false;
}

function getSystemPrompt() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long'});
  const timeStr = now.toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'});
  return `你是资深A股投研总监，拥有20年实战经验，融合东方财富、同花顺、英为财情三家平台的分析框架。你的风格：
1. 数据驱动，量化先行，每个判断必须有数据支撑，不讲空话
2. 必须结合传入的真实实时行情数据（最新价格、涨跌幅、PE、资金流）做研判
3. 分析框架：宏观周期定位→大盘技术面→资金面→行业轮动→个股精选
4. 板块联动逻辑：美股AI→A股算力/半导体；油价→石化/军工；汇率→出口链；降息→券商/成长
5. 每次推荐恰好20只股票，给出：五星评级、买入理由、风险点、买入区间、目标价、止损价
6. 预测要有逻辑链：原因→推导→结论→概率
7. 风险评估要量化：下跌概率、最大回撤、风险收益比
8. 使用markdown格式，##标题分段
9. 结尾给出"今日操作策略"和"3条交易铁律"
10. 如果传入了自选股列表（含实时价格和成本价），必须逐只分析，给出明确的持有/减仓/清仓信号和具体价位
11. ⚠️ 重要：当前真实日期是 ${dateStr} ${timeStr}。你必须基于这个日期做分析，不要使用其他日期。
12. 免责声明：AI分析仅供参考，不构成投资建议`;
}

// 拉取实时大盘快照供 Prompt 使用
async function fetchMarketSnapshot() {
  try {
    if (typeof fetchIndexData !== 'function') return null;
    const data = await fetchIndexData();
    const sh = data.sh000001 || {}, sz = data.sz399001 || {}, cyb = data.sz399006 || {};
    return {
      sh: { name:'上证指数', price:sh.price||'—', pct:sh.pct||'0', vol:sh.volume||'—' },
      sz: { name:'深证成指', price:sz.price||'—', pct:sz.pct||'0', vol:sz.volume||'—' },
      cyb:{ name:'创业板指', price:cyb.price||'—', pct:cyb.pct||'0', vol:cyb.volume||'—' }
    };
  } catch(e) { return null; }
}

function buildDailyPrompt(today, snapshot, watchlistSummary, watchlistCount) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long'});
  const timeStr = now.toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const mkt = snapshot ? `\n## 实时大盘快照\n- 上证指数：${snapshot.sh.price}，涨跌${snapshot.sh.pct}%\n- 深证成指：${snapshot.sz.price}，涨跌${snapshot.sz.pct}%\n- 创业板指：${snapshot.cyb.price}，涨跌${snapshot.cyb.pct}%\n请务必结合以上真实数据展开分析。\n` : '';
  const wl = watchlistSummary ? `\n## ⚠️ 自选股持仓分析（必须逐只分析，给出明确操作信号）\n${watchlistSummary}\n\n对每只自选股必须给出：\n1. 当前技术面状态（趋势方向、关键均线位置）\n2. 资金面判断（主力进出方向、散户情绪）\n3. 风险评估（距止损位距离、潜在风险点）\n4. **个人持仓盈亏分析（核心）**：\n   - 基于成本价和当前价的盈亏状态\n   - 持仓市值、成本总额、浮动盈亏金额\n   - 若持仓过大（占总仓位>20%），建议适当减仓分散风险\n   - 若浮亏>15%，必须给出是否止损的明确建议\n5. 明确操作信号（必须选其一）：\n   - 🟢 **建议持有**（附持有理由和目标价）\n   - 🟡 **建议减仓**（附减仓比例和时机）\n   - 🔴 **建议清仓**（附清仓理由和止损价）\n6. 具体操作价位（买入区间、目标价、止损价）\n7. **主力出货判断**（重点）：\n   - 内外盘实战分析：内盘>外盘时主力是否主动卖出\n   - 托单出货：涨停板封单是否真实，散户是否在出逃\n   - 对倒出货：主力是否通过对倒制造放量假象\n   - 压单出货：是否有大单压顶但小单成交的特征\n   - 天量天价：成交量暴增+价格高位 = 顶部信号\n8. **成交量异动**：放量滞涨/缩量阴跌/底部放量/天量天价\n9. **尾盘半小时异动检测**（14:30-15:00）：\n   - 尾盘大单集中抛售 = 砸盘出货信号\n   - 尾盘急速拉升 = 可能是诱多\n   - 尾盘放量滞涨 = 主力对倒\n   - 尾盘缩量阴跌 = 散户恐慌性抛售\n10. **三大失效场景判断**：\n   - 系统性暴跌（个股跌幅>5%，技术分析失效）\n   - 黑天鹅事件（异常放量+暴跌，资金面分析失效）\n   - 疑似洗盘（主力昨日流出今日回补，资金面假信号）\n11. **早盘核心多空资金流向**（9:30-11:30）：\n   - 早盘主力净流入/流出金额和方向\n   - 早盘大单集中度（大单/超大单占比）\n   - 早盘资金流向是建仓还是出货\n   - 早盘走势对全天的预示意义\n12. **尾盘集合竞价监控**（14:57-15:00）：\n   - 集合竞价阶段主力资金流向\n   - 是否存在大资金不计成本砸盘收尾\n   - 集合竞价异动对次日开盘的影响\n   - 尾盘是否有诱多拉抬行为\n` : '';
  return `📅 当前真实日期：${dateStr} ${timeStr}（请基于此日期分析，不要使用其他日期）
⚠️ 以下所有数据均为实时获取的最新数据，请以此为准进行分析。

今天是${today}。请参考东方财富、同花顺、英为财情的分析框架，为我做一份机构级专业投资分析报告。

**重要：报告必须分为【自选股版块】和【推荐股版块】两个独立版块，用明确标题分隔。**

${mkt}${wl}
## 一、宏观环境与周期定位
- 当前处于经济周期的哪个阶段（复苏/过热/滞胀/衰退）
- 货币政策方向（降准降息预期/流动性判断）
- 近期重大政策事件及其对市场的影响

## 二、大盘技术面深度研判
- 上证/深证/创业板 日K位置、量能变化趋势
- MACD（金叉/死叉/背离）、均线系统（多头/空头排列）
- 关键支撑压力位（写清具体点位，精确到个位）
- 市场情绪指标（涨跌家数比、涨停跌停数、连板高度）
- 大盘短期走势预判（上涨/震荡/下跌概率各多少）

## 三、国际市场传导分析
- 昨夜美股走势及原因
- 大宗商品对A股板块的映射
- 地缘政治对军工、能源、供应链的影响

## 四、行业轮动与板块联动
明确指出3-5条最强主线板块，每条写明：
- 主线逻辑、催化事件、核心龙头（给代码）、跟涨标的
- 板块持续性判断（短炒/中线/长线）

---

## 五、📊 自选股操作建议（${watchlistCount}只）
${watchlistSummary ? '对以上每只自选股给出明确的持有/减仓/清仓信号和具体价位。' : '当前无自选股，请跳过此版块。'}
每只股票格式：
| 股票 | 信号 | 理由 | 目标价 | 止损价 |

## 五-A、💰 个人持仓资金分析（基于自选股数据）
根据自选股的成本价、持仓股数、当前价，给出完整的资金分析：
1. **持仓总市值**：所有自选股的持仓市值之和
2. **总成本**：所有自选股的成本总额之和
3. **总浮动盈亏**：总市值-总成本，盈亏比例
4. **仓位结构**：每只股票占总市值的比例，是否过于集中
5. **调仓建议**：是否有需要减仓/加仓的，给出具体建议

## 六、🚨 主力出货深度分析（自选股逐只判断）
对每只自选股重点分析以下维度：
1. **四大内外盘实战用法**：
   - 内盘>外盘 + 主力流出 = 出货信号
   - 外盘>内盘 + 主力流入 = 吸筹信号
   - 涨停板封单 + 散户出逃 = 托单出货
   - 尾盘拉升 + 次日低开 = 尾盘诱多
2. **三种出货手法识别**：
   - 托单出货：大单托住价格，小单持续成交出货
   - 对倒出货：主力自买自卖制造放量假象
   - 压单出货：大单压顶，散户恐慌抛售，主力低位接回
3. **成交量信号**：
   - 天量天价：成交量暴增+价格新高 = 顶部特征
   - 放量滞涨：量增价平 = 上涨乏力
   - 缩量阴跌：量缩价跌 = 阴跌不止
   - 底部放量：量增价升 = 可能启动
4. **三大失效场景**（此时技术分析可能失效）：
   - 系统性暴跌（大盘恐慌，个股分析失效）
   - 黑天鹅事件（突发利空，资金面分析失效）
   - 疑似洗盘（主力假出货真洗盘，资金面假信号）

---

## 七、🎯 今日推荐20只新股票（机构级评级）
| 序号 | 代码 | 名称 | 主线 | 五星评级 | 买入理由 | 风险点 | 主力资金 | 趋势 | 买入区间 | 目标价 | 止损价 |
要求：
- 恰好20只A股，代码规范
- 覆盖不同主线板块（科技/消费/新能源/金融/医药/军工等）
- 不要与自选股重复
- 高估值/下跌通道/主力撤退的标注"回避"

---

## 八、☀️ 早盘核心多空资金流向分析（自选股逐只）
基于11.早盘资金流向，对每只自选股分析：
1. 早盘主力净流入/流出及方向判断
2. 早盘大单集中度反映的主力意图
3. 早盘走势与全天走势的关联性
4. 若早盘大幅流出，午后是否存在反转可能
5. 如何根据早盘信号调整午后策略

---
## 九、🏁 尾盘集合竞价监控（自选股逐只）
基于12.尾盘集合竞价，对每只自选股分析：
1. 集合竞价阶段主力资金是否不计成本砸盘收尾
2. 集合竞价异动对次日开盘的指引
3. 尾盘拉升是否为诱多，是否需减仓回避
4. 集合竞价成交量占比反映的筹码交换情况

---

## 十、风险事件日历
## 十一、今日操作策略（仓位+攻防方向）
## 十二、3条交易铁律
## 十三、免责声明`;`;
}

// 将AI的markdown输出转为HTML
function formatAIResult(text) {
  // 清理AI思考标签（兼容DeepSeek/Qwen等CoT模型）
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  text = text.replace(/<think>[\s\S]*/g, '');
  if (text.includes('</think>')) text = text.split('</think>').pop();
  // 清理其他可能的特殊标签
  text = text.replace(/<\/?think>/g, '');
  text = text.replace(/<\|.*?\|>/g, '');
  text = text.replace(/^[\s\n]*/, '').trim();
  if (!text || text.length < 20) return '<div class="card"><p style="color:#ea3943">AI返回内容异常，请重试</p></div>';

  let html = text
    .replace(/## (.*)/g, '<div class="card"><div class="card-title">$1</div>')
    .replace(/\| *序号[^|]*\| *代码[^\n]*/g,
      '<table class="data-table" style="font-size:12px"><tr><th>序号</th><th>代码</th><th>名称</th><th>主线</th><th>买入理由</th><th>换手率</th><th>主力资金</th><th>散户</th><th>财务风险</th><th>趋势</th><th>买入点</th><th>目标价</th><th>止损</th></tr>')
    .replace(/\| *-+[^\n]*/g, '')
    .replace(/\n\| *(\d+) *\|([^\n]*)/g, function(match, no, rest) {
      const cols = rest.split('|').filter(c => c.trim());
      let row = '<tr><td>'+no+'</td>';
      cols.forEach((c,i) => {
        const v = c.trim();
        let cls = '';
        if (i === 1) row += '<td><b>'+v+'</b></td>';
        else if (i === 5) row += '<td class="'+(v.includes('+')?'up':'down')+'">'+v+'</td>';
        else if (i === 7) {
          const rc = v==='高'?'down':v==='中'?'flat':'up';
          row += '<td class="'+rc+'">'+v+'</td>';
        }
        else if (i === 10) row += '<td class="up">'+v+'</td>';
        else if (i === 11) row += '<td class="down">'+v+'</td>';
        else row += '<td style="font-size:11px">'+v+'</td>';
      });
      row += '</tr>';
      return row;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n/g, '<br>');

  // 补全table标签
  if (html.includes('<table') && !html.includes('</table>')) html += '</table>';
  // 补全card标签
  const cardCount = (html.match(/<div class="card">/g) || []).length;
  for (let i = 0; i < cardCount; i++) html += '</div>';

  return `<div class="card">${html}</div>`;
}

// 离线兜底分析
function getFallbackAnalysis() {
  const today = new Date().toLocaleDateString('zh-CN');
  return `<div class="card">
    <div class="card-title">📊 ${today} 每日分析（离线版）</div>
    <div class="method-section">
      <h3>大盘研判</h3>
      <p>上证指数震荡整理，3200-3300区间运行。创业板相对活跃，科技成长主导。短期关注3250支撑，上方3320压力。</p>
      <h3 style="margin-top:12px">国际局势影响</h3>
      <p>• 美联储暂停加息，全球流动性边际宽松，利好A股科技、消费<br>
      • 中东局势紧张（美伊），推升油价，利好石油/军工，利空航空<br>
      • 中美科技博弈持续，半导体国产替代是长期主线<br>
      • 俄乌冲突拖延，欧洲经济承压，对A股影响边际减弱</p>
      <h3 style="margin-top:12px">美股传导</h3>
      <p>纳斯达克科技股走强，AI/半导体板块领涨。A股对应映射：算力、芯片板块早盘大概率高开。</p>
      <h3 style="margin-top:12px">今日主线</h3>
      <p><b>主线一：</b>AI算力（大模型需求+算力建设）<br>
      <b>主线二：</b>半导体国产替代（政策+事件催化）<br>
      <b>主线三：</b>军工（地缘冲突升级）</p>
    </div>
  </div>
  ${getFallbackStockTable()}`;
}

function getFallbackStockTable() {
  const stocks = [
    {no:1,code:'sz300308',name:'中际旭创',line:'AI算力',logic:'光模块龙头，AI算力核心受益',turnover:'4.2%',capital:'+3.8亿',retail:'散户减持',risk:'低',trend:'多头排列',buyPoint:'回踩180支撑',target:'210',stop:'170'},
    {no:2,code:'sh601138',name:'工业富联',line:'AI算力',logic:'AI服务器龙头，订单饱满',turnover:'2.5%',capital:'+2.1亿',retail:'散户平稳',risk:'低',trend:'多头排列',buyPoint:'站稳28加仓',target:'35',stop:'25'},
    {no:3,code:'sh688981',name:'中芯国际',line:'半导体',logic:'国产替代核心，先进制程突破',turnover:'4.2%',capital:'+3.5亿',retail:'散户追高',risk:'中',trend:'突破20日线',buyPoint:'回踩75不破',target:'90',stop:'72'},
    {no:4,code:'sz002371',name:'北方华创',line:'半导体',logic:'半导体设备龙头，业绩高增',turnover:'2.8%',capital:'+2.6亿',retail:'散户减持',risk:'低',trend:'多头排列',buyPoint:'340附近',target:'380',stop:'320'},
    {no:5,code:'sz002594',name:'比亚迪',line:'新能源车',logic:'月销创新高+智驾落地',turnover:'3.8%',capital:'+2.3亿',retail:'散户追高',risk:'低',trend:'强势上涨',buyPoint:'回踩MA10(278)',target:'320',stop:'260'},
    {no:6,code:'sh600760',name:'中航沈飞',line:'军工',logic:'歼击机龙头，军费增长受益',turnover:'3.1%',capital:'+1.8亿',retail:'散户平稳',risk:'低',trend:'震荡向上',buyPoint:'回踩50支撑',target:'58',stop:'48'},
    {no:7,code:'sz300750',name:'宁德时代',line:'新能源',logic:'电池全球龙头，海外订单爆发',turnover:'2.1%',capital:'+1.8亿',retail:'散户减持',risk:'低',trend:'多头排列',buyPoint:'站稳220',target:'250',stop:'200'},
    {no:8,code:'sh600519',name:'贵州茅台',line:'消费白马',logic:'业绩确定性强，外资回流标的',turnover:'0.5%',capital:'+4.1亿',retail:'散户少量买入',risk:'低',trend:'高位震荡',buyPoint:'回调至1700',target:'1900',stop:'1650'},
    {no:9,code:'sz000977',name:'浪潮信息',line:'AI算力',logic:'AI服务器+信创双轮驱动',turnover:'5.2%',capital:'+1.5亿',retail:'散户追高',risk:'中',trend:'底部放量',buyPoint:'突破40确认',target:'48',stop:'36'},
    {no:10,code:'sh603501',name:'韦尔股份',line:'半导体',logic:'CIS芯片龙头，手机复苏受益',turnover:'3.5%',capital:'+1.5亿',retail:'散户平稳',risk:'中',trend:'金叉确认',buyPoint:'站稳95',target:'110',stop:'88'},
  ];
  const stocks2 = [
    {no:11,code:'sz300059',name:'东方财富',line:'券商',logic:'互联网券商龙头，行情回暖受益',turnover:'6.5%',capital:'+0.8亿',retail:'散户追高',risk:'低',trend:'放量突破',buyPoint:'回踩17.5',target:'22',stop:'16'},
    {no:12,code:'sh600893',name:'航发动力',line:'军工',logic:'航发核心企业，军机放量',turnover:'2.2%',capital:'+1.2亿',retail:'散户少量',risk:'低',trend:'震荡',buyPoint:'回踩MA20(42)',target:'52',stop:'40'},
    {no:13,code:'sz002179',name:'中航光电',line:'军工',logic:'军用连接器龙头',turnover:'1.8%',capital:'+0.9亿',retail:'散户减持',risk:'低',trend:'多头排列',buyPoint:'回踩55',target:'65',stop:'52'},
    {no:14,code:'sh601919',name:'中远海控',line:'航运',logic:'运价回升+分红预期',turnover:'3.2%',capital:'+1.6亿',retail:'散户追高',risk:'低',trend:'底部放量',buyPoint:'站稳14',target:'18',stop:'12.5'},
    {no:15,code:'sz000858',name:'五粮液',line:'消费白马',logic:'白酒需求回暖+渠道改善',turnover:'0.8%',capital:'+1.2亿',retail:'散户少量',risk:'低',trend:'震荡筑底',buyPoint:'回调至135',target:'160',stop:'128'},
    {no:16,code:'sh600276',name:'恒瑞医药',line:'医药',logic:'创新药龙头，出海加速',turnover:'2.5%',capital:'+1.4亿',retail:'散户平稳',risk:'低',trend:'上涨趋势',buyPoint:'回踩MA10(52)',target:'62',stop:'48'},
    {no:17,code:'sz002475',name:'立讯精密',line:'消费电子',logic:'果链+汽车电子双驱动',turnover:'3.5%',capital:'-0.5亿',retail:'散户买入',risk:'中',trend:'⚠️下跌通道',buyPoint:'建议观望',target:'—',stop:'—'},
    {no:18,code:'sh601012',name:'隆基绿能',line:'光伏',logic:'光伏龙头超跌',turnover:'5.1%',capital:'-0.5亿',retail:'散户抄底',risk:'高',trend:'⚠️下跌通道',buyPoint:'建议观望',target:'—',stop:'—'},
    {no:19,code:'sh688111',name:'金山办公',line:'软件',logic:'办公软件+AI概念',turnover:'2.8%',capital:'-1.2亿',retail:'散户追高',risk:'高',trend:'⚠️高位回落',buyPoint:'不建议买入(PE过高)',target:'—',stop:'—'},
    {no:20,code:'sz300760',name:'迈瑞医疗',line:'医疗器械',logic:'医械龙头',turnover:'1.2%',capital:'-0.8亿',retail:'散户少量',risk:'中',trend:'⚠️高位震荡',buyPoint:'建议观望等回调',target:'—',stop:'—'},
  ];
  const all = stocks.concat(stocks2);
  return `<div class="card">
    <div class="card-title" style="color:#16c784">今日推荐20只A股（详细分析版）</div>
    <div style="overflow-x:auto">
    <table class="data-table" style="font-size:12px">
      <tr><th>序号</th><th>代码</th><th>名称</th><th>主线</th><th>买入理由</th><th>换手率</th><th>主力资金</th><th>散户</th><th>财务风险</th><th>趋势</th><th>建议买入点</th><th>目标价</th><th>止损</th></tr>
      ${all.map(s=>{
        const riskCls = s.risk==='高'?'down':s.risk==='中'?'flat':'up';
        const trendWarn = s.trend.includes('⚠️');
        const capCls = s.capital.startsWith('+')?'up':'down';
        return `<tr${trendWarn?' style="background:#1c1014"':''}>
        <td>${s.no}</td><td>${s.code}</td><td><b>${s.name}</b></td><td>${s.line}</td>
        <td style="font-size:11px">${s.logic}</td>
        <td>${s.turnover}</td>
        <td class="${capCls}">${s.capital}</td>
        <td style="font-size:11px">${s.retail}</td>
        <td class="${riskCls}">${s.risk}</td>
        <td${trendWarn?' class="down"':''}>${s.trend}</td>
        <td style="font-size:11px${s.buyPoint.includes('观望')||s.buyPoint.includes('不建议')?';color:#ea3943':''}">${s.buyPoint}</td>
        <td class="up">${s.target}</td>
        <td class="down">${s.stop}</td>
      </tr>`}).join('')}
    </table>
    </div>
    <div class="tip-box" style="margin-top:12px;border-left-color:#ea3943">
      <b>⚠️ 风险提示：</b>标红行为高风险股票（处于下跌通道或高估值），建议观望不买入。
      本分析仅供参考学习，不构成投资建议，股市有风险入市需谨慎。
    </div>
  </div>`;
}
