// 个股查询模块
function renderStockQuery(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-title">个股查询</div>
      <div class="toolbar">
        <input type="text" id="stockInput" placeholder="输入股票代码，如 sh600519、sz000858" style="width:300px">
        <button class="btn btn-primary" onclick="queryStock()">查询</button>
        <span style="font-size:12px;color:#8b949e">提示：上海sh+代码，深圳sz+代码</span>
      </div>
    </div>
    <div id="stockResult"></div>
    <div id="klineChart"></div>
  `;
}

async function queryStock() {
  const code = document.getElementById('stockInput').value.trim();
  if (!code) { alert('请输入股票代码'); return; }
  const result = document.getElementById('stockResult');
  result.innerHTML = '<div class="card"><p style="color:#8b949e">查询中...</p></div>';
  const data = await fetchAStockQuote(code);
  if (!data) { result.innerHTML = '<div class="card"><p style="color:#ea3943">未找到该股票</p></div>'; return; }
  renderStockResult(data, code);
  renderKline(code, data.price || 100);
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
