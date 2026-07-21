// 每日AI智能分析模块
const AI_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const AI_MODEL = 'Qwen/Qwen3-32B';

function getAIKey() {
  return localStorage.getItem('ai_api_key') || '';
}
function saveAIKey(k) {
  localStorage.setItem('ai_api_key', k);
}

// 获取自选股实时行情（批量）
async function fetchWatchlistQuotes() {
  const key = 'stock_watchlist_' + (currentUser?.username || 'guest');
  let watchlist = [];
  try { watchlist = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  if (!watchlist.length) return { list: [], quotes: {} };
  const quotes = {};
  // 并行拉取所有股票行情（带缓存）
  const fetches = watchlist.map(async s => {
    try {
      const data = await fetchAStockQuote(s.code);
      if (data) quotes[s.code] = data;
    } catch(e) {}
  });
  await Promise.allSettled(fetches);
  // 拉取资金流向
  const capFetches = watchlist.map(async s => {
    try {
      const capData = await fetchEMCapitalFlow(s.code);
      if (capData && capData.length) {
        const latest = capData[capData.length - 1];
        quotes[s.code] = quotes[s.code] || {};
        quotes[s.code].capitalFlow = latest;
        quotes[s.code].capitalTrend = capData.slice(-5);
      }
    } catch(e) {}
  });
  await Promise.allSettled(capFetches);
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
    const cost = s.addPrice || '未知';
    const target = s.targetPrice || '未设';
    const stop = s.stopLoss || '未设';
    const pnl = s.addPrice ? (((parseFloat(price) - parseFloat(s.addPrice)) / parseFloat(s.addPrice)) * 100).toFixed(2) + '%' : '未知';
    const methods = (s.methods || []).join('/') || '无';
    return `${i+1}. ${s.name}(${s.code}) | 现价:${price} 涨跌:${pct} PE:${pe} | 成本:${cost} 盈亏:${pnl} | 目标:${target} 止损:${stop} | 主力:${capStr} | 选股方法:${methods}`;
  }).join('\n');
}

function renderDailyAI(el) {
  const today = new Date().toISOString().slice(0, 10);
  const cached = getDailyCache(today);
  const savedKey = getAIKey();
  const keyMask = savedKey ? savedKey.slice(0,6)+'****'+savedKey.slice(-4) : '未配置';
  el.innerHTML = `
    <div class="card">
      <div class="card-title">🤖 每日智能分析</div>
      <p style="color:#8b949e;font-size:13px">AI自动分析大盘走势、自选股风险、买卖信号，推荐主线股票</p>
      <div style="margin-top:8px;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:4px">
        <div style="font-size:12px;color:#8b949e;margin-bottom:6px">
          当前API Key：<span style="color:#58a6ff">${keyMask}</span>
          （<a href="https://cloud.siliconflow.cn/account/ak" target="_blank" style="color:#58a6ff">免费申请硅基流动Key</a>）
        </div>
        <div style="display:flex;gap:6px">
          <input type="password" id="aiKeyInput" placeholder="粘贴sk-开头的API Key" style="flex:1;padding:6px;background:#161b22;border:1px solid #30363d;color:#e6e6e6;border-radius:4px;font-size:12px">
          <button class="btn btn-blue btn-sm" onclick="setAIKey()">保存Key</button>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="generateDailyAnalysis()" id="aiBtn">生成今日分析</button>
        <button class="btn btn-blue" onclick="showFallbackNow()">查看离线示例</button>
        <span style="font-size:12px;color:#8b949e;line-height:32px" id="aiStatus">${cached ? '今日已生成，可重新生成' : (savedKey ? '点击按钮开始分析' : '未配置API Key，将显示离线分析')}</span>
      </div>
    </div>
    <div id="marketOverviewArea"></div>
    <div id="watchlistSignalArea"></div>
    <div id="dailyResult">${cached ? cached : ''}</div>
  `;
  // 异步加载大盘概览和自选股信号（不影响主体渲染）
  loadMarketOverview();
  loadWatchlistSignals();
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
      const rtData = { capitalFlow: q.capitalFlow || null, turnover: q.volume || null };
      const ev = evaluateWatchStock(enrichedStock, marketCtx, rtData);
      return { stock: s, quote: q, evaluation: ev };
    });
    // 按风险排序：卖出>减仓>持有>买入
    const order = { sell: 0, reduce: 1, hold: 2, buy: 3 };
    evaluations.sort((a, b) => (order[a.evaluation.signal] || 2) - (order[b.evaluation.signal] || 2));
    const sigMap = { sell: '🔴 清仓', reduce: '🟠 减仓', hold: '🟡 持有', buy: '🟢 买入' };
    const sigCls = { sell: 'down', reduce: 'down', hold: 'flat', buy: 'up' };
    const bgMap = { sell: '#2d0a0a', reduce: '#2d1f0a', hold: '#0d1117', buy: '#0a2d1a' };
    area.innerHTML = `<div class="card" style="border-left:3px solid #f0883e">
      <div class="card-title">⚡ 自选股实时信号（${list.length}只）</div>
      <div style="font-size:12px;color:#8b949e;margin-bottom:8px">大盘环境：<span style="color:${marketCtx.color}">${marketCtx.desc}</span></div>
      <div style="overflow-x:auto"><table class="data-table" style="font-size:12px">
        <tr><th>股票</th><th>现价</th><th>涨跌</th><th>信号</th><th>卖出分</th><th>买入分</th><th>主力资金</th><th>操作建议</th></tr>
        ${evaluations.map(({stock:s, quote:q, evaluation:ev}) => {
          const pct = q.pct !== undefined ? q.pct : '—';
          const pctCls = parseFloat(pct) >= 0 ? 'up' : 'down';
          const cap = ev.capital || {};
          const mainStr = cap.main || '—';
          const mainCls = (typeof mainStr === 'string' && mainStr.startsWith('+')) ? 'up' : 'down';
          return `<tr style="background:${bgMap[ev.signal] || '#0d1117'}">
            <td><b>${s.name}</b><div style="font-size:10px;color:#8b949e">${s.code}</div></td>
            <td>${q.price || s.price || '—'}</td>
            <td class="${pctCls}">${pct !== '—' ? (parseFloat(pct)>=0?'+':'') + pct + '%' : '—'}</td>
            <td class="${sigCls[ev.signal]||'flat'}" style="font-weight:700">${sigMap[ev.signal]||'持有'}</td>
            <td class="down">${ev.sellScore}</td>
            <td class="up">${ev.buyScore}</td>
            <td class="${mainCls}">${mainStr}</td>
            <td style="font-size:11px">${ev.tradeAction}</td>
          </tr>`;
        }).join('')}
      </table></div>
      <div class="tip-box" style="margin-top:8px;font-size:11px">
        <b>信号说明：</b>🔴清仓(卖出分≥80) | 🟠减仓(≥40) | 🟡持有 | 🟢买入(买入分≥70)
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
  if (!v.startsWith('sk-')) { alert('API Key格式不正确，应以sk-开头'); return; }
  saveAIKey(v);
  alert('API Key已保存');
  renderDailyAI(document.getElementById('mainContent'));
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
  status.textContent = 'AI深度分析中（含自选股+大盘数据）...';
  const prompt = buildDailyPrompt(today, marketSnapshot, watchlistSummary, watchlist.length);

  try {
    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: AI_MODEL, temperature: 0.4, max_tokens: 10000,
        enable_thinking: false,
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: prompt }
        ]
      })
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
  return `你是资深A股投研总监，拥有20年实战经验，融合东方财富、同花顺、英为财情三家平台的分析框架。你的风格：
1. 数据驱动，量化先行，每个判断必须有数据支撑，不讲空话
2. 必须结合传入的真实大盘数据（上证/深证/创业板实时点位）做研判
3. 分析框架：宏观周期定位→大盘技术面→资金面→行业轮动→个股精选
4. 板块联动逻辑：美股AI→A股算力/半导体；油价→石化/军工；汇率→出口链；降息→券商/成长
5. 每次推荐恰好15只股票，给出：五星评级、买入理由、风险点、买入区间、目标价、止损价
6. 预测要有逻辑链：原因→推导→结论→概率
7. 风险评估要量化：下跌概率、最大回撤、风险收益比
8. 使用markdown格式，##标题分段
9. 结尾给出"今日操作策略"和"3条交易铁律"
10. 如果传入了自选股列表，必须逐只分析，给出明确买入/卖出/持有信号和具体价位
11. 免责声明：AI分析仅供参考，不构成投资建议`;
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
  const mkt = snapshot ? `\n## 实时大盘快照\n- 上证指数：${snapshot.sh.price}，涨跌${snapshot.sh.pct}%\n- 深证成指：${snapshot.sz.price}，涨跌${snapshot.sz.pct}%\n- 创业板指：${snapshot.cyb.price}，涨跌${snapshot.cyb.pct}%\n请务必结合以上真实数据展开分析。\n` : '';
  const wl = watchlistSummary ? `\n## 自选股实时数据（必须逐只分析，给出明确操作信号）\n${watchlistSummary}\n\n要求：对每只自选股必须给出：\n1. 当前技术面状态（趋势方向、关键均线位置）\n2. 资金面判断（主力进出方向）\n3. 风险评估（距止损位距离、潜在风险点）\n4. 明确操作信号：买入/加仓/持有/减仓/清仓\n5. 具体操作价位（买入区间、目标价、止损价）\n` : '';
  return `今天是${today}。请参考东方财富、同花顺、英为财情的分析框架，为我做一份机构级专业投资分析报告：
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

## 五、今日推荐15只股票（机构级评级）
| 序号 | 代码 | 名称 | 主线 | 五星评级 | 买入理由 | 风险点 | 主力资金 | 趋势 | 买入区间 | 目标价 | 止损价 |
要求：恰好15只A股，代码规范，高估值/下跌通道/主力撤退的标注"回避"

## 六、风险事件日历
## 七、今日操作策略（仓位+攻防方向）
## 八、3条交易铁律
## 九、免责声明`;
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
