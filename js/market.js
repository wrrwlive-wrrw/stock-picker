// 大盘总览模块
function renderMarket(el) {
  el.innerHTML = `
    <div class="index-grid" id="indexGrid">
      <div class="index-card"><div class="index-name">加载中...</div></div>
    </div>
    <div class="card">
      <div class="card-title">市场热点</div>
      <div id="hotTopics">${renderHotTopics()}</div>
    </div>
    <div class="card">
      <div class="card-title">涨跌统计</div>
      ${renderMarketStats()}
    </div>
  `;
  loadIndexData();
}

async function loadIndexData() {
  const data = await fetchIndexData();
  const grid = document.getElementById('indexGrid');
  if (!grid) return;
  const keys = Object.keys(data);
  grid.innerHTML = keys.map(k => {
    const d = data[k];
    const cls = d.pct > 0 ? 'up' : d.pct < 0 ? 'down' : 'flat';
    const sign = d.pct > 0 ? '+' : '';
    return `<div class="index-card">
      <div class="index-name">${d.name}</div>
      <div class="index-value ${cls}">${d.value.toFixed(2)}</div>
      <div class="index-change ${cls}">${sign}${d.change.toFixed(2)} (${sign}${d.pct.toFixed(2)}%)</div>
    </div>`;
  }).join('');
}

function renderHotTopics() {
  const topics = [
    { title:'AI算力板块持续活跃', tag:'热门', type:'positive' },
    { title:'美联储维持利率不变，市场反应平稳', tag:'宏观', type:'neutral' },
    { title:'新能源汽车销量创新高', tag:'行业', type:'positive' },
    { title:'房地产政策持续放松', tag:'政策', type:'neutral' },
    { title:'半导体国产替代加速', tag:'主题', type:'positive' },
    { title:'中东局势紧张，油价波动', tag:'地缘', type:'negative' }
  ];
  return topics.map(t => `<div style="padding:8px 0;border-bottom:1px solid #21262d;display:flex;align-items:center;gap:8px">
    <span class="factor-tag tag-${t.type}">${t.tag}</span>
    <span style="font-size:13px">${t.title}</span>
  </div>`).join('');
}

function renderMarketStats() {
  return `<div style="display:flex;gap:30px;font-size:13px;padding:10px 0">
    <div><span class="up">上涨：2456家</span></div>
    <div><span class="down">下跌：2134家</span></div>
    <div><span class="flat">平盘：312家</span></div>
    <div>涨停：56家 | 跌停：12家</div>
    <div>成交额：9876亿</div>
  </div>`;
}
