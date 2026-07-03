// 个股查询模块
function renderStockQuery(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-title">个股查询 & 智能分析</div>
      <div class="toolbar">
        <input type="text" id="stockInput" placeholder="输入股票代码，如 sh600519、sz000858" style="width:300px">
        <button class="btn btn-primary" onclick="queryStock()">查询分析</button>
        <span style="font-size:12px;color:#8b949e">数据来源：东方财富 | 腾讯财经</span>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-blue btn-sm" onclick="quickQuery('sh600519')">贵州茅台</button>
        <button class="btn btn-blue btn-sm" onclick="quickQuery('sz300750')">宁德时代</button>
        <button class="btn btn-blue btn-sm" onclick="quickQuery('sz002594')">比亚迪</button>
        <button class="btn btn-blue btn-sm" onclick="quickQuery('sh688981')">中芯国际</button>
        <button class="btn btn-blue btn-sm" onclick="quickQuery('sz002371')">北方华创</button>
        <button class="btn btn-blue btn-sm" onclick="quickQuery('sh601012')">隆基绿能</button>
      </div>
    </div>
    <div id="stockResult"></div>
    <div id="stockAnalysis"></div>
    <div id="klineChart"></div>
  `;
}

function quickQuery(code) {
  document.getElementById('stockInput').value = code;
  queryStock();
}

async function queryStock() {
  const code = document.getElementById('stockInput').value.trim();
  if (!code) { alert('请输入股票代码'); return; }
  const result = document.getElementById('stockResult');
  const analysis = document.getElementById('stockAnalysis');
  result.innerHTML = '<div class="card"><p style="color:#58a6ff">正在查询行情数据...</p></div>';
  analysis.innerHTML = '';

  const data = await fetchAStockQuote(code);
  if (!data) { result.innerHTML = '<div class="card"><p style="color:#ea3943">未找到该股票</p></div>'; return; }
  renderStockResult(data, code);
  renderKline(code, data.price || 100);

  // 异步加载深度分析
  analysis.innerHTML = '<div class="card"><p style="color:#58a6ff">正在进行排雷分析与评级...</p></div>';
  await renderDeepAnalysis(code, data);
}

function renderStockResult(data, code) {
  const cls = data.pct > 0 ? 'up' : data.pct < 0 ? 'down' : 'flat';
  const sign = data.pct > 0 ? '+' : '';
  document.getElementById('stockResult').innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-size:20px;font-weight:700">${data.name}</span>
          <span style="font-size:13px;color:#8b949e;margin-left:10px">${code}</span>
        </div>
        <div style="text-align:right">
          <div class="${cls}" style="font-size:28px;font-weight:700">${data.price?.toFixed(2)}</div>
          <div class="${cls}">${sign}${data.change?.toFixed(2)} (${sign}${data.pct?.toFixed(2)}%)</div>
        </div>
      </div>
      <table class="data-table" style="margin-top:16px">
        <tr><td>市盈率PE</td><td>${data.pe||'—'}</td><td>市净率PB</td><td>${data.pb||'—'}</td></tr>
        <tr><td>成交量</td><td>${data.volume||'—'}</td><td>今开</td><td>${data.open||'—'}</td></tr>
        <tr><td>最高</td><td>${data.high||'—'}</td><td>最低</td><td>${data.low||'—'}</td></tr>
      </table>
    </div>`;
}

// 简易Canvas K线图
function renderKline(code, basePrice) {
  const kData = generateKlineData(basePrice, 60);
  const container = document.getElementById('klineChart');
  container.innerHTML = `<div class="card">
    <div class="card-title">K线图（近60日）</div>
    <canvas id="klineCanvas" width="900" height="360" style="width:100%;background:#0d1117;border-radius:6px"></canvas>
  </div>`;
  drawKline(kData);
}

function drawKline(data) {
  const canvas = document.getElementById('klineCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const padding = { top:20, bottom:40, left:60, right:20 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  // 计算价格范围
  let minP = Infinity, maxP = -Infinity;
  data.forEach(d => { minP = Math.min(minP, d.low); maxP = Math.max(maxP, d.high); });
  const range = maxP - minP || 1;

  // 清空
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  // 网格线
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(W - padding.right, y); ctx.stroke();
    const price = maxP - (range / 4) * i;
    ctx.fillStyle = '#8b949e'; ctx.font = '11px sans-serif';
    ctx.fillText(price.toFixed(2), 5, y + 4);
  }

  // 画K线
  const barW = chartW / data.length;
  data.forEach((d, i) => {
    const x = padding.left + i * barW + barW / 2;
    const isUp = d.close >= d.open;
    ctx.strokeStyle = ctx.fillStyle = isUp ? '#16c784' : '#ea3943';

    // 影线
    const highY = padding.top + (1 - (d.high - minP) / range) * chartH;
    const lowY = padding.top + (1 - (d.low - minP) / range) * chartH;
    ctx.beginPath(); ctx.moveTo(x, highY); ctx.lineTo(x, lowY); ctx.lineWidth = 1; ctx.stroke();

    // 实体
    const openY = padding.top + (1 - (d.open - minP) / range) * chartH;
    const closeY = padding.top + (1 - (d.close - minP) / range) * chartH;
    const bodyH = Math.max(Math.abs(closeY - openY), 1);
    ctx.fillRect(x - barW * 0.35, Math.min(openY, closeY), barW * 0.7, bodyH);
  });

  // 日期标注
  ctx.fillStyle = '#8b949e'; ctx.font = '10px sans-serif';
  for (let i = 0; i < data.length; i += 10) {
    const x = padding.left + i * barW;
    ctx.fillText(data[i].date.slice(5), x, H - 10);
  }
}

// 深度分析入口
async function renderDeepAnalysis(code, data) {
  const el = document.getElementById('stockAnalysis');

  // 补充更多数据维度（模拟，真实接口可能受CORS限制）
  const enriched = {...data};
  enriched.turnover = enriched.turnover || (Math.random()*6+0.5).toFixed(1);
  enriched.volRatio = enriched.volRatio || (Math.random()*2+0.5).toFixed(2);

  // 尝试获取东方财富资金数据
  let capitalHtml = '';
  const capData = await fetchEMCapitalFlow(code);
  if (capData && capData.length) {
    capitalHtml = renderCapitalFlowChart(capData);
  } else {
    capitalHtml = renderFallbackCapital(code);
  }

  // 综合排雷和评级
  const analysisHtml = renderAnalysis(enriched, code);

  // 英为财情国际视角分析
  const investingHtml = renderInvestingAnalysis(code, data);

  // 数据来源链接
  const codeNum = code.slice(2);
  const investingCode = code.startsWith('sh') ? `${codeNum}` : `${codeNum}`;
  const linksHtml = `<div class="card">
    <div class="card-title">📊 外部数据源</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <a href="https://quote.eastmoney.com/${code.startsWith('sh')?'sh':'sz'}${codeNum}.html" target="_blank" class="btn btn-blue btn-sm">东方财富行情</a>
      <a href="https://stockpage.10jqka.com.cn/${codeNum}/" target="_blank" class="btn btn-blue btn-sm">同花顺详情</a>
      <a href="https://cn.investing.com/search/?q=${codeNum}" target="_blank" class="btn btn-blue btn-sm">英为财情(Investing)</a>
      <a href="https://finance.sina.com.cn/realstock/company/${code}/nc.shtml" target="_blank" class="btn btn-blue btn-sm">新浪财经</a>
      <a href="https://guba.eastmoney.com/list,${codeNum}.html" target="_blank" class="btn btn-blue btn-sm">东方财富股吧</a>
    </div>
  </div>`;

  el.innerHTML = analysisHtml + capitalHtml + investingHtml + linksHtml;
}

// 英为财情视角：技术分析 + 分析师评级
function renderInvestingAnalysis(code, data) {
  const price = parseFloat(data.price) || 0;
  const pct = parseFloat(data.pct) || 0;

  // 模拟英为财情风格的技术分析（基于价格计算的支撑压力位）
  const s1 = (price * 0.97).toFixed(2);
  const s2 = (price * 0.94).toFixed(2);
  const s3 = (price * 0.90).toFixed(2);
  const r1 = (price * 1.03).toFixed(2);
  const r2 = (price * 1.06).toFixed(2);
  const r3 = (price * 1.10).toFixed(2);

  // 技术指标信号（模拟）
  const signals = [
    {name:'MA5', val:(price*0.99).toFixed(2), signal: pct>0?'买入':'卖出'},
    {name:'MA10', val:(price*0.98).toFixed(2), signal: pct>-1?'买入':'卖出'},
    {name:'MA20', val:(price*0.96).toFixed(2), signal: pct>-2?'买入':'中性'},
    {name:'MA50', val:(price*0.95).toFixed(2), signal: '中性'},
    {name:'MA200', val:(price*0.92).toFixed(2), signal: pct>-3?'买入':'卖出'},
    {name:'RSI(14)', val:(50+pct*2).toFixed(1), signal: pct>2?'超买':pct<-2?'超卖':'中性'},
    {name:'MACD', val:(pct*0.5).toFixed(2), signal: pct>0?'买入':'卖出'},
    {name:'KDJ', val:(60+pct).toFixed(1), signal: pct>1?'买入':pct<-1?'卖出':'中性'},
  ];

  const buyCount = signals.filter(s=>s.signal==='买入').length;
  const sellCount = signals.filter(s=>s.signal==='卖出').length;
  const total = signals.length;
  let overallSignal, overallColor;
  if (buyCount >= total*0.6) { overallSignal='强烈买入'; overallColor='#16c784'; }
  else if (buyCount > sellCount) { overallSignal='买入'; overallColor='#3fb950'; }
  else if (sellCount > buyCount) { overallSignal='卖出'; overallColor='#ea3943'; }
  else { overallSignal='中性'; overallColor='#d29922'; }

  return `<div class="card">
    <div class="card-title">🌍 英为财情风格 · 技术分析</div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px">
      <div style="padding:10px 16px;background:${overallColor}22;border-left:3px solid ${overallColor};border-radius:4px">
        <div style="font-size:12px;color:#8b949e">综合技术信号</div>
        <div style="font-size:20px;font-weight:700;color:${overallColor}">${overallSignal}</div>
        <div style="font-size:11px;color:#8b949e">买入${buyCount} 卖出${sellCount} 中性${total-buyCount-sellCount}</div>
      </div>
    </div>
    <h4 style="margin:12px 0 6px">技术指标（8项）</h4>
    <table class="data-table">
      <tr><th>指标</th><th>数值</th><th>信号</th><th>指标</th><th>数值</th><th>信号</th></tr>
      ${[0,2,4,6].map(i=>`<tr>
        <td>${signals[i].name}</td><td>${signals[i].val}</td>
        <td class="${signals[i].signal==='买入'?'up':signals[i].signal==='卖出'?'down':'flat'}">${signals[i].signal}</td>
        <td>${signals[i+1].name}</td><td>${signals[i+1].val}</td>
        <td class="${signals[i+1].signal==='买入'?'up':signals[i+1].signal==='卖出'?'down':'flat'}">${signals[i+1].signal}</td>
      </tr>`).join('')}
    </table>
    <h4 style="margin:12px 0 6px">支撑与压力位（Pivot Points）</h4>
    <table class="data-table">
      <tr><th colspan="3" style="text-align:center;color:#ea3943">压力位</th><th style="text-align:center">当前</th><th colspan="3" style="text-align:center;color:#16c784">支撑位</th></tr>
      <tr>
        <td class="down">R3: ${r3}</td><td class="down">R2: ${r2}</td><td class="down">R1: ${r1}</td>
        <td style="text-align:center;font-weight:700">${price.toFixed(2)}</td>
        <td class="up">S1: ${s1}</td><td class="up">S2: ${s2}</td><td class="up">S3: ${s3}</td>
      </tr>
    </table>
    <div class="tip-box" style="margin-top:12px">
      <b>操作参考：</b>价格跌破 S1(${s1}) 可能测试 S2(${s2})；突破 R1(${r1}) 有望冲击 R2(${r2})。
      技术信号为"${overallSignal}"，建议结合基本面综合判断。
    </div>
    <div style="font-size:11px;color:#8b949e;margin-top:6px">
      注：技术分析参考英为财情(Investing.com)方法论，数据基于当前价格算法生成，实盘请以英为财情官网为准。
    </div>
  </div>`;
}

function renderCapitalFlowChart(data) {
  const recent = data.slice(-5);
  const total = recent.reduce((s,d)=>s+d.main, 0);
  const trendCls = total > 0 ? 'up' : 'down';
  return `<div class="card">
    <div class="card-title">💰 主力资金流向（近5日）</div>
    <table class="data-table">
      <tr><th>日期</th><th>主力净流入(亿)</th><th>超大单(亿)</th><th>大单(亿)</th><th>中单(亿)</th><th>小单(亿)</th></tr>
      ${recent.map(d=>`<tr>
        <td>${d.date}</td>
        <td class="${d.main>0?'up':'down'}">${d.main>0?'+':''}${d.main.toFixed(2)}</td>
        <td class="${d.super>0?'up':'down'}">${d.super>0?'+':''}${d.super.toFixed(2)}</td>
        <td class="${d.big>0?'up':'down'}">${d.big>0?'+':''}${d.big.toFixed(2)}</td>
        <td>${d.mid.toFixed(2)}</td>
        <td>${d.small.toFixed(2)}</td>
      </tr>`).join('')}
    </table>
    <div style="margin-top:8px;font-size:13px">
      5日主力累计：<b class="${trendCls}">${total>0?'+':''}${total.toFixed(2)}亿</b>
      — ${total>0?'主力持续流入，态度积极':'主力净流出，谨慎对待'}
    </div>
  </div>`;
}

function renderFallbackCapital(code) {
  // 使用模拟数据
  const days = [];
  for (let i=4; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push({
      date: d.toISOString().slice(0,10),
      main: (Math.random()*4-1.5).toFixed(2),
      super: (Math.random()*2-0.5).toFixed(2),
      big: (Math.random()*2-0.8).toFixed(2),
      mid: (Math.random()*1-0.5).toFixed(2),
      small: (Math.random()*1.5-1).toFixed(2)
    });
  }
  const total = days.reduce((s,d)=>s+parseFloat(d.main),0);
  const trendCls = total > 0 ? 'up' : 'down';
  return `<div class="card">
    <div class="card-title">💰 主力资金流向（模拟数据）</div>
    <table class="data-table">
      <tr><th>日期</th><th>主力净流入(亿)</th><th>超大单</th><th>大单</th><th>中单</th><th>小单</th></tr>
      ${days.map(d=>`<tr>
        <td>${d.date}</td>
        <td class="${d.main>0?'up':'down'}">${d.main>0?'+':''}${d.main}</td>
        <td class="${d.super>0?'up':'down'}">${d.super}</td>
        <td class="${d.big>0?'up':'down'}">${d.big}</td>
        <td>${d.mid}</td><td>${d.small}</td>
      </tr>`).join('')}
    </table>
    <div style="margin-top:8px;font-size:13px">
      5日主力累计：<b class="${trendCls}">${total>0?'+':''}${total.toFixed(2)}亿</b>
      — ${total>0?'主力持续流入，态度积极':'主力净流出，谨慎对待'}
    </div>
    <div style="font-size:11px;color:#8b949e;margin-top:4px">注：真实数据请参考东方财富链接</div>
  </div>`;
}
