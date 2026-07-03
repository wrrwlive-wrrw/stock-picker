// 每日AI智能分析模块
const AI_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const AI_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

function getAIKey() {
  return localStorage.getItem('ai_api_key') || '';
}
function saveAIKey(k) {
  localStorage.setItem('ai_api_key', k);
}

function renderDailyAI(el) {
  const today = new Date().toISOString().slice(0, 10);
  const cached = getDailyCache(today);
  const savedKey = getAIKey();
  const keyMask = savedKey ? savedKey.slice(0,6)+'****'+savedKey.slice(-4) : '未配置';
  el.innerHTML = `
    <div class="card">
      <div class="card-title">🤖 每日智能分析</div>
      <p style="color:#8b949e;font-size:13px">AI自动分析当日行情、国际局势、美股动态，推荐10只主线股票</p>
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
      <div style="margin-top:12px;display:flex;gap:10px">
        <button class="btn btn-primary" onclick="generateDailyAnalysis()" id="aiBtn">生成今日分析</button>
        <button class="btn btn-blue" onclick="showFallbackNow()">查看离线示例</button>
        <span style="font-size:12px;color:#8b949e;line-height:32px" id="aiStatus">${cached ? '今日已生成，可重新生成' : (savedKey ? '点击按钮开始分析' : '未配置API Key，将显示离线分析')}</span>
      </div>
    </div>
    <div id="dailyResult">${cached ? cached : ''}</div>
  `;
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
  const prompt = buildDailyPrompt(today);

  try {
    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: AI_MODEL, temperature: 0.7, max_tokens: 2000,
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
    const text = data.choices?.[0]?.message?.content;
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
  return `你是一位资深A股投资分析师，拥有20年实战经验。你的分析风格：
1. 简洁直接，不废话
2. 必须给出具体股票代码和名称
3. 结合国际局势、美股走势、政策面综合分析
4. 每次必须推荐恰好10只股票，标注买入逻辑和目标价
5. 用markdown格式输出，使用##标题分段`;
}

function buildDailyPrompt(today) {
  return `今天是${today}，请为我做一份完整的每日投资分析报告，包含：

## 一、今日大盘研判
分析A股（上证/深证/创业板）当前走势、支撑位压力位、短期方向判断

## 二、国际局势对A股影响
分析当前国际热点（美伊冲突、俄乌局势、中美关系、美联储政策等）对A股各板块的具体影响

## 三、隔夜美股分析
昨夜美股（道琼斯/纳斯达克/标普）走势对今日A股的传导影响，哪些板块受益/承压

## 四、今日主线方向
明确给出2-3条今日最强主线方向和逻辑

## 五、今日推荐10只股票
以表格形式列出：
| 序号 | 代码 | 名称 | 所属主线 | 买入逻辑 | 目标价 | 止损价 |

要求：
- 10只股票必须覆盖不同主线
- 必须有明确的股票代码（如600519、300750）
- 给出具体的目标价和止损价
- 买入逻辑简明扼要`;
}

// 将AI的markdown输出转为HTML
function formatAIResult(text) {
  let html = text
    .replace(/## (.*)/g, '<div class="card"><div class="card-title">$1</div>')
    .replace(/\| *序号/g, '<table class="data-table"><tr><th>序号</th>')
    .replace(/\| *-+/g, '')
    .replace(/\n\| *(\d+) *\| *([^|]*)\| *([^|]*)\| *([^|]*)\| *([^|]*)\| *([^|]*)\| *([^|]*)\|?/g,
      '<tr><td>$1</td><td>$2</td><td><b>$3</b></td><td>$4</td><td style="font-size:11px">$5</td><td class="up">$6</td><td class="down">$7</td></tr>')
    .replace(/\| *代码/g, '<th>代码</th><th>名称</th><th>主线</th><th>逻辑</th><th>目标价</th><th>止损</th></tr>')
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
    {no:1,code:'sz300308',name:'中际旭创',line:'AI算力',logic:'光模块龙头，AI算力核心受益',target:'180',stop:'155'},
    {no:2,code:'sh601138',name:'工业富联',line:'AI算力',logic:'AI服务器龙头，订单饱满',target:'30',stop:'25'},
    {no:3,code:'sh688981',name:'中芯国际',line:'半导体',logic:'国产替代核心，先进制程突破',target:'90',stop:'72'},
    {no:4,code:'sz002371',name:'北方华创',line:'半导体',logic:'半导体设备龙头，业绩高增',target:'380',stop:'320'},
    {no:5,code:'sz002594',name:'比亚迪',line:'新能源车',logic:'月销创新高+智驾落地',target:'320',stop:'260'},
    {no:6,code:'sh600760',name:'中航沈飞',line:'军工',logic:'歼击机龙头，军费增长受益',target:'58',stop:'48'},
    {no:7,code:'sz300750',name:'宁德时代',line:'新能源',logic:'电池全球龙头，海外订单爆发',target:'250',stop:'200'},
    {no:8,code:'sh600519',name:'贵州茅台',line:'消费白马',logic:'业绩确定性强，外资回流标的',target:'1900',stop:'1680'},
    {no:9,code:'sz000977',name:'浪潮信息',line:'AI算力',logic:'AI服务器+信创双轮驱动',target:'45',stop:'36'},
    {no:10,code:'sh603501',name:'韦尔股份',line:'半导体',logic:'CIS芯片龙头，手机复苏受益',target:'110',stop:'88'},
  ];
  return `<div class="card">
    <div class="card-title" style="color:#16c784">今日推荐10只主线股票</div>
    <table class="data-table">
      <tr><th>序号</th><th>代码</th><th>名称</th><th>主线</th><th>买入逻辑</th><th>目标价</th><th>止损</th><th>自选</th></tr>
      ${stocks.map(s=>`<tr>
        <td>${s.no}</td><td>${s.code}</td><td><b>${s.name}</b></td><td>${s.line}</td>
        <td style="font-size:11px">${s.logic}</td><td class="up">${s.target}</td><td class="down">${s.stop}</td>
        <td><button class="btn btn-blue btn-sm" onclick="addToWatchlist('${s.code}','${s.name}','${s.target}','每日推荐')">+自选</button></td>
      </tr>`).join('')}
    </table>
  </div>`;
}
