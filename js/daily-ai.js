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
  // 先拉取真实大盘数据注入 Prompt
  status.textContent = '拉取实时大盘数据中...';
  const marketSnapshot = await fetchMarketSnapshot();
  status.textContent = 'AI分析中，请稍候（含真实大盘数据）...';
  const prompt = buildDailyPrompt(today, marketSnapshot);

  try {
    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: AI_MODEL, temperature: 0.5, max_tokens: 6000,
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
  return `你是资深A股投研总监，融合东方财富、同花顺、英为财情三家平台的分析框架。你的风格：
1. 简洁直接，量化数据先行，不讲空话
2. 必须结合传入的真实大盘数据（上证/深证/创业板实时点位）做研判
3. 分析框架：宏观→大盘技术面→资金面（北向/融资）→板块联动→个股
4. 板块联动逻辑：美股AI→A股算力/半导体；油价→石化/军工；汇率→出口链；地产→银行/建材
5. 每次推荐恰好20只股票，必须给出：五星评级、买入理由(3条)、风险点(3条)、买入区间、目标价、止损价、持有周期
6. 使用markdown格式，##标题分段，表格数据整齐
7. 结尾必须给出"今日3条交易铁律"
8. 免责声明：AI分析仅供参考，不构成投资建议`;
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

function buildDailyPrompt(today, snapshot) {
  const mkt = snapshot ? `\n## 实时大盘快照（作为分析基础）\n- 上证指数：${snapshot.sh.price}，涨跌${snapshot.sh.pct}%\n- 深证成指：${snapshot.sz.price}，涨跌${snapshot.sz.pct}%\n- 创业板指：${snapshot.cyb.price}，涨跌${snapshot.cyb.pct}%\n请务必结合以上真实数据展开分析。\n` : '';
  return `今天是${today}。请参考东方财富、同花顺、英为财情的分析框架，为我做一份专业级投资分析报告：${mkt}
## 一、大盘技术面研判
- 上证/深证/创业板 日K位置、量能、MACD、均线多空
- 关键支撑压力位（写清具体点位）
- 北向资金今日预估流向

## 二、国际市场传导
- 昨夜美股（道琼斯/纳指/标普）+欧洲主要指数走势
- 大宗商品（油/金/铜/美元指数）对A股板块的映射
- 地缘政治（中美/俄乌/中东）对军工、能源、供应链的具体影响

## 三、板块联动分析
明确指出3-5条最强主线板块，写明：主线逻辑 + 催化事件 + 核心龙头 + 跟涨标的

## 四、今日推荐20只股票（专业评级版）
以表格列出，必须包含全部字段：
| 序号 | 代码 | 名称 | 主线 | 五星评级 | 买入理由(3条) | 风险点(3条) | 换手率 | 主力资金 | 财务风险 | 趋势 | 买入区间 | 目标价 | 止损价 | 持有周期 |

要求：
- 恰好20只A股，代码规范（如sh600519）
- 五星评级：★★★★★强烈推荐/★★★★推荐/★★★观望/★★不建议/★回避
- 高估值(PE>行业均值50%)、下跌通道、主力撤退的股票明确标注"回避"或"观望"
- 每只必须写清风险点，让用户理性决策

## 五、今日3条交易铁律
针对当前大盘环境，给出3条今日必须遵守的交易纪律

## 六、免责声明
本分析由AI生成，仅供参考，不构成投资建议，股市有风险入市需谨慎`;
}

// 将AI的markdown输出转为HTML
function formatAIResult(text) {
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
