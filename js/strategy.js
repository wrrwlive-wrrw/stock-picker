// 选股策略工具模块 - 实时行情驱动
const ST_CODES = ['sz002594','sh600519','sz300750','sh688981','sz000333','sh601012','sz002371','sh603501','sz300059','sh601318'];
let stData = {}, stCapData = {}, stTimer = null, stTab = 'smart';

function renderStrategy(el) {
  if (stTimer) { clearInterval(stTimer); stTimer = null; }
  el.innerHTML = `
    <div class="card">
      <div class="card-title">选股策略工具 <span id="stStatus" style="font-size:12px;color:#8b949e;font-weight:normal">加载中...</span></div>
      <div class="tabs">
        <div class="tab active" onclick="showStrategyTab('smart')">综合遴选</div>
        <div class="tab" onclick="showStrategyTab('turnover')">换手率</div>
        <div class="tab" onclick="showStrategyTab('volume')">成交量</div>
        <div class="tab" onclick="showStrategyTab('capital')">主力资金</div>
        <div class="tab" onclick="showStrategyTab('ma')">均线系统</div>
        <div class="tab" onclick="showStrategyTab('custom')">自定义筛选</div>
      </div>
      <div id="strategyContent"><p style="color:#8b949e;padding:20px">正在加载实时数据...</p></div>
    </div>`;
  loadStrategyData().then(() => showStrategyTab(stTab));
  stTimer = setInterval(() => { loadStrategyData().then(() => showStrategyTab(stTab)); }, 60000);
}

async function loadStrategyData() {
  const el = document.getElementById('stStatus');
  if (el) el.textContent = '更新中...';
  const qm = await fetchAStockQuotesBatch(ST_CODES).catch(() => ({}));
  Object.entries(qm).forEach(([c, q]) => { if (q) q._code = c; });
  Object.assign(stData, qm);
  const flows = ST_CODES.map(async c => {
    const f = await fetchEMCapitalFlow(c).catch(() => null);
    if (f && f.length) stCapData[c] = f;
  });
  await Promise.allSettled(flows);
  if (el) el.textContent = '已更新 ' + new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

function showStrategyTab(tab) {
  stTab = tab;
  document.querySelectorAll('.card .tabs .tab').forEach(el => {
    const map = {smart:'综合',turnover:'换手',volume:'成交量',capital:'主力',ma:'均线',custom:'自定义'};
    el.classList.toggle('active', el.textContent.includes(map[tab]));
  });
  const content = document.getElementById('strategyContent');
  if (!content) return;
  const cmds = {smart:renderSmartPick,turnover:renderTurnover,volume:renderVolume,capital:renderCapitalFlow,ma:renderMA,custom:renderCustom};
  content.innerHTML = (cmds[tab] || renderSmartPick)();
}

// --- 以下各 tab 渲染函数 ---

function renderSmartPick() {
  const src = ST_CODES.map(c => stData[c]).filter(Boolean);
  const picks = src.map(q => {
    const t = q.turnover || 0; const vr = q.volRatio || 0;
    const cap = stCapData[q._code] ? stCapData[q._code][0] : null;
    const capStr = cap ? (cap.main >= 0 ? '+' : '') + cap.main.toFixed(2) + '亿' : '--';
    const maSignal = q.price > (q.prevClose||1)*1.01 ? '站上5日线' : '震荡整理';
    const score = Math.min(100, Math.round(
      (t > 1 && t < 8 ? 25 : 5) + (vr > 1.5 ? 25 : vr > 1 ? 15 : 5) +
      (cap && cap.main > 0 ? 25 : 5) + (q.pct > 0 ? 25 : 10)
    ));
    const signal = score >= 85 ? '强势突破' : score >= 70 ? '温和放量' : '观望';
    const key = q._code;
    return {...q, key, turnoverStr: t.toFixed(1)+'%', volRatioStr: vr.toFixed(2), capStr, score, signal, maSignal};
  }).sort((a,b) => b.score - a.score);
  return `<div class="method-section">
    <div class="tip-box">
      <b>综合遴选逻辑：</b>换手率3%-8%（活跃但不过热）+ 量比>1.5（放量）+ 主力净流入>0 + 均线多头排列/金叉。
      综合评分越高，各维度信号越一致，胜率越高。
    </div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>价格</th><th>涨幅</th><th>换手率</th><th>量比</th><th>主力净流入</th><th>均线状态</th><th>评分</th><th>信号</th><th>自选</th></tr>
      ${picks.map(p => {
        const pCls = p.pct >= 0 ? 'up' : 'down'; const cCls = (p.capStr||'').startsWith('+') ? 'up' : 'down';
        return `<tr>
        <td>${p.key}</td><td><b>${stData[p.key]?.name||p.name||p.key}</b></td>
        <td class="${pCls}">${p.price.toFixed(2)}</td><td class="${pCls}">${p.pct >= 0 ? '+' : ''}${p.pct.toFixed(2)}%</td>
        <td>${p.turnoverStr}</td><td>${p.volRatioStr}</td>
        <td class="${cCls}">${p.capStr}</td><td>${p.maSignal}</td>
        <td><b class="${p.score >= 80 ? 'up' : 'flat'}">${p.score}</b></td><td class="${p.score >= 70 ? 'up' : 'flat'}">${p.signal}</td>
        <td><button class="btn btn-blue btn-sm" onclick="addToWatchlist('${p.key}','${stData[p.key]?.name||p.name||p.key}','${p.price.toFixed(2)}','综合评分${p.score}')">+自选</button></td>
      </tr>`}).join('')}
    </table>
  </div>`;
}

function renderVolume() {
  const src = ST_CODES.map(c => stData[c]).filter(Boolean);
  const stocks = src.filter(q => (q.volRatio||0) >= 0.5).sort((a,b) => (b.volRatio||0) - (a.volRatio||0)).slice(0, 6);
  return `<div class="method-section">
    <div class="tip-box">
      <b>成交量选股逻辑：</b><br>
      • <b>量比&gt;1.5：</b>明显放量，说明有新资金进入<br>
      • <b>量比&gt;2.0：</b>显著放量，主力大概率在运作<br>
      • <b>底部放量：</b>长期缩量后突然放量 = 变盘信号（看涨）<br>
      • <b>高位放量：</b>连续大涨后放量滞涨 = 出货信号（看跌）<br>
      • 核心公式：<span class="up">缩量调整→放量突破→买入</span>
    </div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>价格</th><th>涨幅</th><th>今日量</th><th>量比</th><th>信号</th><th>强度</th></tr>
      ${stocks.map(s => { const vr = s.volRatio||0; const key = s._code;
        const pCls = s.pct >= 0 ? 'up' : 'down'; const level = vr >= 2 ? '极强' : vr >= 1.5 ? '强' : '中';
        const signal = vr >= 2 ? '放量突破' : vr >= 1.5 ? '温和放量' : '量能一般';
        return `<tr><td>${key}</td><td><b>${s.name||key}</b></td><td class="${pCls}">${s.price.toFixed(2)}</td><td class="${pCls}">${s.pct >= 0 ? '+' : ''}${s.pct.toFixed(2)}%</td>
        <td>${s.volume||'--'}</td><td class="up">${vr.toFixed(2)}</td>
        <td style="font-size:11px" class="up">${signal}</td><td class="${level === '极强' ? 'up' : 'flat'}">${level}</td></tr>`;}).join('')}
    </table>
  </div>`;
}

function renderCapitalFlow() {
  const src = ST_CODES.map(c => stData[c]).filter(Boolean);
  return `<div class="method-section">
    <div class="tip-box">
      <b>主力资金选股逻辑：</b><br>
      • <b>超大单（&gt;100万）：</b>机构/游资主力行为<br>
      • <b>大单（20-100万）：</b>大户跟随行为<br>
      • <span class="up">主力净流入&gt;0 且 连续3天以上 = 建仓信号</span><br>
      • 主力流入 + 散户流出 = 典型洗盘吸筹特征<br>
      • 5日累计净流入方向比单日更有参考价值
    </div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>价格</th><th>涨幅</th><th>主力净流入</th><th>超大单</th><th>大单</th><th>散户</th><th>5日累计</th><th>判断</th></tr>
      ${src.map(s => { const cf = stCapData[s._code] || []; const today = cf[0] || {};
        const days5 = cf.slice(0, 5).reduce((sum, d) => sum + (d.main||0), 0);
        const main = today.main||0; const sup = today.super||0; const big = today.big||0; const small = today.small||0;
        const cls = v => v >= 0 ? 'up' : 'down'; const fmt = v => (v >= 0 ? '+' : '') + v.toFixed(2) + '亿';
        const signal = main > 0 && days5 > 0 ? '主力持续流入' : main > 0 ? '今日流入' : '主力流出';
        const pCls = s.pct >= 0 ? 'up' : 'down'; const key = s._code;
        return `<tr><td>${key}</td><td><b>${s.name||key}</b></td><td class="${pCls}">${s.price.toFixed(2)}</td><td class="${pCls}">${s.pct >= 0 ? '+' : ''}${s.pct.toFixed(2)}%</td>
        <td class="${cls(main)}">${fmt(main)}</td><td class="${cls(sup)}">${fmt(sup)}</td>
        <td class="${cls(big)}">${fmt(big)}</td><td class="${cls(-small)}">${fmt(-small)}</td>
        <td class="${cls(days5)}">${fmt(days5)}</td><td class="${cls(main)}">${signal}</td></tr>`;}).join('')}
    </table>
  </div>`;
}
function renderTurnover() {
  const src = ST_CODES.map(c => stData[c]).filter(Boolean);
  const stocks = src.filter(q => (q.turnover||0) >= 1).sort((a,b) => (b.turnover||0) - (a.turnover||0)).slice(0, 6);
  return `<div class="method-section">
    <div class="tip-box">
      <b>换手率选股逻辑：</b><br>
      • 换手率&lt;1%：缩量冷门，暂不关注<br>
      • 换手率1%-3%：正常交投，观望为主<br>
      • <span class="up">换手率3%-7%：活跃区间，主力可能建仓或拉升（重点关注）</span><br>
      • 换手率&gt;10%：过热，可能是主力对倒出货，谨慎<br>
      • 关键：换手率连续3天递增 + 股价上涨 = 强烈买入信号
    </div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>价格</th><th>涨幅</th><th>今日换手</th><th>状态</th><th>分析</th></tr>
      ${stocks.map(s => {
        const t = s.turnover||0; const key = s._code;
        const status = t >= 7 ? '高度活跃' : t >= 3 ? '活跃区间' : t >= 1 ? '温和放量' : '缩量冷门';
        const tip = t >= 7 ? '换手率偏高，注意主力出货风险' : t >= 3 ? '换手率适中，资金关注度高' : '换手率偏低，暂观望';
        const pCls = s.pct >= 0 ? 'up' : 'down';
        return `<tr>
        <td>${key}</td><td><b>${s.name||key}</b></td><td class="${pCls}">${s.price.toFixed(2)}</td><td class="${pCls}">${s.pct >= 0 ? '+' : ''}${s.pct.toFixed(2)}%</td>
        <td class="up">${t.toFixed(1)}%</td><td class="up">${status}</td><td style="font-size:11px">${tip}</td>
      </tr>`}).join('')}
    </table>
  </div>`;
}

async function fetchTencentMA() {
  const codes = ST_CODES.map(c => c.startsWith('sh') ? c : c.startsWith('sz') ? c : c).join(',');
  try {
    const text = await fetchWithProxy('http://qt.gtimg.cn/q=' + codes, 'gbk');
    const result = {}; const lines = text.split(';').filter(l => l.trim());
    lines.forEach(line => {
      const m = line.match(/v_(\w+)="(.+)"/); if (!m) return;
      const parts = m[2].split('~'); const code = m[1];
      if (parts.length >= 23) result[code] = { ma5: parseFloat(parts[20])||0, ma10: parseFloat(parts[21])||0, ma20: parseFloat(parts[22])||0 };
    });
    return result;
  } catch(e) { return {}; }
}

function renderMA() {
  const src = ST_CODES.map(c => stData[c]).filter(Boolean);
  return `<div class="method-section">
    <div class="tip-box">
      <b>均线系统选股逻辑：</b><br>
      • <b>MA5（5日线）：</b>短线趋势，价格站上MA5=短线看多<br>
      • <b>MA10（10日线）：</b>中短线趋势，跌破MA10短线离场<br>
      • <b>MA20（20日线）：</b>中线生命线，跌破MA20中线转空<br>
      • <span class="up">多头排列：MA5&gt;MA10&gt;MA20 = 强势上涨通道（重点买入）</span><br>
      • 金叉（MA5上穿MA10/MA20）= 趋势反转信号<br>
      • 死叉（MA5下穿MA10/MA20）= 离场信号
    </div>
    <div style="margin:8px 0"><button class="btn btn-sm" style="background:#238636;color:#fff" onclick="fetchTencentMA().then(d=>{window.stMaData=d;showStrategyTab('ma')})">刷新均线数据</button></div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>现价</th><th>MA5</th><th>MA10</th><th>MA20</th><th>均线位置</th><th>状态</th><th>操作建议</th></tr>
      ${src.map(s => {
        const key = s._code; const ma = window.stMaData?.[key] || {};
        const p = s.price; const ma5 = ma.ma5||0; const ma10 = ma.ma10||0; const ma20 = ma.ma20||0;
        const hasMA = ma5 && ma10 && ma20;
        const pos = hasMA ? (p > ma5 && ma5 > ma10 && ma10 > ma20 ? '多头排列' :
          p > ma5 && ma5 > ma10 ? '短期多头' : p > ma20 ? '站上20日线' : '空头排列') : '需刷新';
        const status = hasMA ? (pos === '多头排列' ? '强势上涨' : pos === '短期多头' ? '震荡上行' : pos === '站上20日线' ? '企稳' : '弱势') : '--';
        const action = hasMA ? (pos === '多头排列' ? '持有/加仓' : pos === '站上20日线' ? '轻仓试探' : '观望') : '--';
        const pCls = s.pct >= 0 ? 'up' : 'down';
        return `<tr><td>${key}</td><td><b>${s.name||key}</b></td><td class="${pCls}">${p.toFixed(2)}</td>
        <td>${ma5 ? ma5.toFixed(2) : '--'}</td><td>${ma10 ? ma10.toFixed(2) : '--'}</td><td>${ma20 ? ma20.toFixed(2) : '--'}</td>
        <td style="font-size:11px">${pos}</td><td class="${status === '强势上涨' ? 'up' : 'flat'}">${status}</td><td class="up">${action}</td></tr>`;}).join('')}
    </table>
  </div>`;
}

function renderCustom() {
  return `<div class="method-section">
    <h3>多维度自定义筛选</h3>
    <div class="toolbar" style="flex-wrap:wrap;gap:12px">
      <div><label style="font-size:12px;color:#8b949e">换手率：</label><input type="number" id="trMin" placeholder="最低%" style="width:60px"> - <input type="number" id="trMax" placeholder="最高%" style="width:60px"></div>
      <div><label style="font-size:12px;color:#8b949e">量比≥：</label><input type="number" id="volRatioMin" placeholder="1.5" style="width:60px"></div>
      <div><label style="font-size:12px;color:#8b949e">涨幅：</label>
        <select id="pctFilter" style="width:90px"><option value="">全部</option><option value="up">上涨</option><option value="down">下跌</option></select>
      </div>
      <button class="btn btn-primary" onclick="runCustomFilter()">筛选</button>
    </div>
    <div id="customResult" style="margin-top:12px">
      <p style="color:#8b949e;font-size:13px">基于实时行情数据筛选，设置条件后点击"筛选"</p>
    </div>
  </div>`;
}

function runCustomFilter() {
  const trMin = parseFloat(document.getElementById('trMin')?.value) || 0;
  const trMax = parseFloat(document.getElementById('trMax')?.value) || 99;
  const vrMin = parseFloat(document.getElementById('volRatioMin')?.value) || 0;
  const pctFilter = document.getElementById('pctFilter')?.value || '';
  const src = ST_CODES.map(c => stData[c]).filter(Boolean);
  const filtered = src.filter(s =>
    (s.turnover||0) >= trMin && (s.turnover||0) <= trMax &&
    (s.volRatio||0) >= vrMin &&
    (!pctFilter || (pctFilter === 'up' ? s.pct > 0 : s.pct < 0))
  );
  const el = document.getElementById('customResult');
  if (!filtered.length) { el.innerHTML = '<p style="color:#f0883e">未找到符合条件的股票，请放宽条件</p>'; return; }
  el.innerHTML = `<table class="data-table">
    <tr><th>代码</th><th>名称</th><th>价格</th><th>涨幅</th><th>换手率</th><th>量比</th></tr>
    ${filtered.map(s => { const pCls = s.pct >= 0 ? 'up' : 'down';
      return `<tr><td>${s._code}</td><td><b>${s.name||s._code}</b></td><td class="${pCls}">${s.price.toFixed(2)}</td>
      <td class="${pCls}">${s.pct >= 0 ? '+' : ''}${s.pct.toFixed(2)}%</td><td>${(s.turnover||0).toFixed(1)}%</td>
      <td>${(s.volRatio||0).toFixed(2)}</td></tr>`;}).join('')}
  </table>`;
}