// AI选股智能体模块 — 根据股票代码进行全面深度分析
// 复用 daily-ai.js 的 AI_API_URL, AI_MODEL, getAIKey()

function renderAIAgent(el) {
  const savedKey = getAIKey();
  const keyMask = savedKey ? savedKey.slice(0,6)+'****'+savedKey.slice(-4) : '未配置';
  el.innerHTML = `
    <div class="card">
      <div class="card-title">🧠 AI选股智能体</div>
      <p style="color:#8b949e;font-size:13px">输入股票代码或名称，AI将从技术面、基本面、资金面、消息面、行业对比五大维度进行全面深度分析，给出风险预警和买卖建议。</p>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="text" id="aiAgentCode" placeholder="股票代码 如 sh600519" style="width:160px;padding:8px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px">
        <input type="text" id="aiAgentName" placeholder="名称(可选)" style="width:120px;padding:8px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px">
        <button class="btn btn-primary" onclick="startAIAnalysis()" id="aiAgentBtn">开始深度分析</button>
        <span style="font-size:12px;color:#8b949e" id="aiAgentStatus">${savedKey ? '输入代码后点击分析' : '请先在每日分析页配置API Key'}</span>
      </div>
      <div style="margin-top:8px;font-size:12px;color:#8b949e">
        💡 支持输入：纯数字(600519)、带前缀(sh600519)、股票名称(贵州茅台)
      </div>
      <div style="margin-top:8px;font-size:12px;color:#8b949e">
        💡 支持输入：纯数字(600519)、带前缀(sh600519)、股票名称(贵州茅台)、简称(茅台)
      </div>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sh600519','贵州茅台')">茅台</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sz300750','宁德时代')">宁德时代</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sz002594','比亚迪')">比亚迪</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sh688981','中芯国际')">中芯国际</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sz000333','美的集团')">美的</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sh601012','隆基绿能')">隆基</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sh600036','招商银行')">招行</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sz000858','五粮液')">五粮液</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sh600276','恒瑞医药')">恒瑞</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sz002371','北方华创')">北方华创</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sh601899','紫金矿业')">紫金矿业</button>
        <button class="btn btn-sm" style="background:#21262d;color:#8b949e" onclick="quickAIAnalysis('sz000651','格力电器')">格力</button>
      </div>
    </div>
    <div id="aiAgentResult"></div>
  `;
}

function quickAIAnalysis(code, name) {
  document.getElementById('aiAgentCode').value = code;
  document.getElementById('aiAgentName').value = name;
  startAIAnalysis();
}

// 自动修正股票代码格式
function normalizeStockCode(input) {
  let code = input.trim();
  if (/^\d{6}$/.test(code)) {
    if (code.startsWith('6')) code = 'sh' + code;
    else if (code.startsWith('0') || code.startsWith('3')) code = 'sz' + code;
    else if (code.startsWith('68')) code = 'sh' + code;
    else code = 'sh' + code;
  }
  return code.toLowerCase();
}

// 核心：解析输入，返回 {code, name} 或 null
// 优先级：搜索API精确匹配 > 搜索API模糊匹配 > 静态映射表 > SAMPLE_STOCKS
async function resolveStockInput(inputCode, inputName) {
  let code = (inputCode || '').trim();
  let name = (inputName || '').trim();
  // 用户同时输入了代码和名称，直接修正代码
  if (code && name) {
    code = normalizeStockCode(code);
    return { code, name };
  }
  // 只输入了名称
  if (!code && name) {
    const results = await searchStockByKeyword(name);
    if (results.length > 0) {
      // 精确名称匹配
      const exact = results.find(r => r.name === name);
      if (exact) return { code: exact.code, name: exact.name };
      // 包含匹配
      const partial = results.find(r => r.name.includes(name) || name.includes(r.name));
      if (partial) return { code: partial.code, name: partial.name };
      // 返回第一个结果
      return { code: results[0].code, name: results[0].name };
    }
    return null; // 搜索API无结果
  }
  // 只输入了代码（可能是纯数字、带前缀、也可能是名称混在代码框）
  const searchInput = code;
  code = normalizeStockCode(code);
  // 1. 先用搜索API查（覆盖用户输入名称在代码框的情况）
  const results = await searchStockByKeyword(searchInput);
  if (results.length > 0) {
    // 精确代码匹配
    const exactCode = results.find(r => r.code === code);
    if (exactCode) return { code: exactCode.code, name: exactCode.name };
    // 搜索结果第一个
    return { code: results[0].code, name: results[0].name };
  }
  // 2. 搜索API无结果，用修正后的代码直接查行情
  return { code, name: '' };
}

// 主分析流程
async function startAIAnalysis() {
  const rawCode = document.getElementById('aiAgentCode').value.trim();
  const rawName = document.getElementById('aiAgentName').value.trim();
  if (!rawCode && !rawName) { alert('请输入股票代码或名称'); return; }

  const apiKey = getAIKey();
  if (!apiKey) { alert('请先在"每日分析"页面配置API Key'); return; }

  const btn = document.getElementById('aiAgentBtn');
  const status = document.getElementById('aiAgentStatus');
  const result = document.getElementById('aiAgentResult');
  btn.disabled = true;
  status.textContent = '正在搜索匹配股票...';
  result.innerHTML = '<div class="card"><p style="color:#58a6ff">AI智能体启动中...</p></div>';

  // 第0步：解析输入，找到真实股票代码
  let resolved = null;
  try {
    resolved = await resolveStockInput(rawCode, rawName);
  } catch(e) { console.warn('搜索解析失败', e); }

  if (!resolved || !resolved.code) {
    result.innerHTML = `<div class="card" style="border-color:#da3633">
      <div class="card-title" style="color:#ea3943">⚠️ 未找到匹配股票</div>
      <p style="color:#ea3943;font-size:13px">"${rawCode || rawName}" 无法匹配到任何A股股票</p>
      <p style="color:#8b949e;font-size:12px;margin-top:8px">
        建议：1)输入6位数字代码(如600519) 2)输入完整名称(如贵州茅台) 3)输入简称(如茅台)
      </p>
    </div>`;
    btn.disabled = false;
    status.textContent = '股票匹配失败';
    return;
  }

  const code = resolved.code;
  let name = resolved.name;
  status.textContent = `已匹配：${name || code}（${code}），正在获取实时行情...`;

  // 第一步：获取实时行情并验证
  let quoteData = null;
  try {
    if (typeof fetchAStockQuote === 'function') {
      quoteData = await fetchAStockQuote(code);
    }
  } catch(e) { console.warn('获取行情失败', e); }

  if (!quoteData) {
    result.innerHTML = `<div class="card" style="border-color:#da3633">
      <div class="card-title" style="color:#ea3943">⚠️ 行情获取失败</div>
      <p style="color:#ea3943;font-size:13px">代码"${code}"匹配成功但行情数据暂不可用</p>
      <p style="color:#8b949e;font-size:12px;margin-top:8px">请稍后重试，或检查网络连接</p>
    </div>`;
    btn.disabled = false;
    status.textContent = '行情获取失败';
    return;
  }

  // 用API返回的真实名称更新name
  if (quoteData.name && !name) name = quoteData.name;
  status.textContent = `${quoteData.name}(${code}) 行情获取成功，AI分析中...`;

  // 第二步：获取资金流向
  let capitalData = null;
  try {
    if (typeof fetchEMCapitalFlow === 'function') {
      capitalData = await fetchEMCapitalFlow(code);
    }
  } catch(e) { console.warn('获取资金流向失败', e); }

  // 第三步：获取大盘环境
  let marketData = null;
  try {
    if (typeof fetchIndexData === 'function') {
      marketData = await fetchIndexData();
    }
  } catch(e) { console.warn('获取大盘数据失败', e); }

  status.textContent = 'AI深度分析中，请稍候（约15-30秒）...';

  // 第四步：构建Prompt并调用AI
  const prompt = buildStockAgentPrompt(code, name, quoteData, capitalData, marketData);
  try {
    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'Qwen/Qwen3-32B',
        temperature: 0.4,
        max_tokens: 12000,
        enable_thinking: false,
        messages: [
          { role: 'system', content: getStockAgentSystemPrompt() },
          { role: 'user', content: prompt }
        ]
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = '状态码 ' + res.status;
      if (res.status === 401) errMsg = 'API Key无效或已过期';
      else if (res.status === 429) errMsg = '调用频率超限，请稍后再试';
      else if (res.status === 403) errMsg = 'API Key权限不足或余额不足';
      throw new Error(errMsg + ' — ' + errText.slice(0,120));
    }
    const data = await res.json();
    let text = data.choices?.[0]?.message?.content || '';
    text = cleanAIResponse(text);
    if (!text) throw new Error('AI返回内容为空');
    const price = quoteData?.price || '';
    result.innerHTML = renderAIAgentReport(text, code, name, price);
    status.textContent = '分析完成';
  } catch(e) {
    console.error('AI智能体分析失败', e);
    result.innerHTML = `<div class="card" style="border-color:#da3633">
      <div class="card-title" style="color:#ea3943">分析失败</div>
      <p style="color:#ea3943;font-size:13px">${e.message || e}</p>
      <p style="color:#8b949e;font-size:12px;margin-top:8px">请检查API Key是否有效，或稍后重试</p>
    </div>`;
    status.textContent = 'AI调用失败';
  }
  btn.disabled = false;
}

// 清理AI返回文本中的思考标签
function cleanAIResponse(text) {
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  text = text.replace(/<think>[\s\S]*/g, '');
  if (text.includes('</think>')) text = text.split('</think>').pop();
  text = text.replace(/<\/?think>/g, '');
  text = text.replace(/<\|.*?\|>/g, '');
  return text.replace(/^[\s\n]*/, '').trim();
}

// AI智能体 System Prompt
function getStockAgentSystemPrompt() {
  return `你是一位全能型A股投研分析师，拥有20年实战经验。你的分析框架融合了：
- 东方财富的数据体系
- 同花顺的技术分析
- 英为财情的全球联动视角
- 机构级的基本面研究方法
- 宏观经济与地缘政治研究能力

分析要求：
1. 必须基于传入的真实数据做分析，不可编造数据
2. 给出明确的、可执行的交易建议（具体价位）
3. 风险预警必须量化（概率、幅度）
4. 使用markdown格式，结构清晰
5. 分析必须覆盖七大维度：技术面、基本面、资金面、消息面、行业对比、宏观政策面、地缘政治面
6. 宏观政策面须涵盖：国内货币/财政政策、产业政策、监管动向、美联储政策、全球央行动态
7. 地缘政治面须涵盖：中美关系、美伊冲突、俄乌局势、台海风险、贸易制裁等对行业和个股的传导路径
8. 最终给出综合评级（1-10分）和明确的操作建议，含短中长期分阶段买入策略
9. 免责声明：AI分析仅供参考，不构成投资建议`;
}

// 构建个股深度分析 Prompt
function buildStockAgentPrompt(code, name, quote, capital, market) {
  let dataSection = '';
  if (quote) {
    dataSection += `\n【实时行情数据】
- 股票：${quote.name || name}（${code}）
- 现价：${quote.price} | 涨跌幅：${quote.pct}%
- 今开：${quote.open || '—'} | 昨收：${quote.prevClose || '—'}
- 最高：${quote.high || '—'} | 最低：${quote.low || '—'}
- PE(市盈率)：${quote.pe || '—'} | PB(市净率)：${quote.pb || '—'}
- 成交量：${quote.volume || '—'}`;
  } else {
    dataSection += `\n【股票】${name || ''}（${code}）— 实时行情获取失败，请基于你的知识分析`;
  }

  if (capital && capital.length > 0) {
    dataSection += '\n\n【近期资金流向（单位：亿元）】';
    capital.slice(-5).forEach(d => {
      dataSection += `\n${d.date}: 主力${d.main>0?'+':''}${d.main.toFixed(2)}亿 | 超大单${d.super>0?'+':''}${d.super.toFixed(2)}亿 | 大单${d.big>0?'+':''}${d.big.toFixed(2)}亿`;
    });
  }

  if (market) {
    const sh = market.sh000001 || market['sh000001'] || {};
    const cyb = market.sz399006 || market['sz399006'] || {};
    dataSection += `\n\n【大盘环境】
- 上证指数：${sh.value || '—'}（${sh.pct>0?'+':''}${sh.pct || 0}%）
- 创业板指：${cyb.value || '—'}（${cyb.pct>0?'+':''}${cyb.pct || 0}%）`;
  }

  return `请对以下股票进行全面深度分析：
${dataSection}

请严格按照以下结构输出分析报告：

## 一、综合评级
给出1-10分评级，并用一句话总结投资价值

## 二、基本面分析
1. 估值水平（PE/PB与行业对比）
2. 盈利能力（ROE/毛利率/净利率趋势）
3. 成长性（营收增速/净利润增速）
4. 财务健康度（负债率/现金流/商誉占比）

## 三、技术面分析
1. 均线系统（5/10/20/60日均线排列）
2. MACD/KDJ/RSI关键信号
3. 支撑位与压力位（给出具体价格）
4. 量价配合分析
5. 当前所处位置（底部/中部/顶部）

## 四、资金面分析
1. 主力资金动向（近期流入/流出趋势）
2. 北向资金态度
3. 融资融券变化
4. 大宗交易信号

## 五、宏观政策面分析
1. 国内政策环境（货币政策松紧、财政刺激力度、LPR/存准率趋势）
2. 产业政策影响（该股所在行业是否受政策扶持或打压，近期重要政策文件）
3. 监管动向（证监会/行业监管最新态度，IPO节奏、减持新规等）
4. 海外政策传导（美联储加息/降息周期、美元指数、人民币汇率对该股影响）
5. 政策受益/受损评级（明确标注该股是政策利好还是利空）

## 六、地缘政治与国际局势分析
1. 中美关系（贸易摩擦、科技制裁、关税政策对该行业的影响）
2. 地区冲突（美伊战争、俄乌冲突等对能源/供应链/避险情绪的传导）
3. 全球供应链风险（脱钩断链风险、关键原材料供应安全）
4. 国际资本流动（外资撤离/流入趋势、MSCI权重变化）
5. 地缘风险对该股的具体传导路径和影响程度（量化评估）

## 七、风险预警
列出所有潜在风险因子，每个标注风险等级（高/中/低）和发生概率：
- 估值泡沫风险
- 业绩暴雷风险
- 大股东减持/质押风险
- 行业政策风险
- 技术破位风险
- 地缘政治黑天鹅风险
- 汇率波动风险

## 八、行业对比
与同行业2-3家公司横向对比核心指标

## 九、分阶段交易策略
| 项目 | 建议 |
|------|------|
| 当前操作 | 买入/观望/减仓/清仓 |
| 短线策略(1-2周) | 具体操作和目标价 |
| 中线策略(1-3月) | 具体操作和目标价 |
| 长线策略(3-12月) | 具体操作和目标价 |
| 首次建仓价 | 具体价格 |
| 加仓价位 | 第一加仓/第二加仓 |
| 目标价 | 第一目标/第二目标/第三目标 |
| 止损价 | 具体价格 |
| 仓位建议 | 初始仓位%→加仓后% |
| 最佳买入时机 | 具体条件描述 |

## 十、总结与下一步行动
1. 3条核心结论
2. 当前最优操作（立即可执行）
3. 未来一周关注的关键事件/数据
4. 触发买入/卖出的信号条件

---
*免责声明：AI分析仅供参考，不构成投资建议。股市有风险，入市需谨慎。*`;
}

// 渲染AI分析报告为HTML
function renderAIAgentReport(text, code, name, price) {
  let html = text;
  // 标题转换
  html = html.replace(/^### (.+)$/gm, '<h4 style="color:#58a6ff;margin:12px 0 6px">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="color:#e6e6e6;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #21262d">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 style="color:#fff;margin:20px 0 10px">$1</h2>');
  // 表格转换
  html = html.replace(/\|(.+)\|\n\|[-| :]+\|\n/g, function(match, header) {
    const cols = header.split('|').map(c => c.trim()).filter(c => c);
    return '<table class="data-table"><tr>' + cols.map(c => '<th>'+c+'</th>').join('') + '</tr>\n';
  });
  html = html.replace(/\|(.+)\|/g, function(match, row) {
    const cols = row.split('|').map(c => c.trim()).filter(c => c);
    return '<tr>' + cols.map(c => '<td>'+c+'</td>').join('') + '</tr>';
  });
  // 关闭表格
  html = html.replace(/(<\/tr>\n?)(?!<tr|<\/table)/g, '$1</table>');
  // 加粗和重点
  html = html.replace(/\*\*(.+?)\*\*/g, '<b style="color:#e6e6e6">$1</b>');
  // 风险标记高亮
  html = html.replace(/高风险|高危|清仓|严重/g, '<span style="color:#ea3943;font-weight:700">$&</span>');
  html = html.replace(/中风险|警戒|减仓|注意/g, '<span style="color:#f0883e;font-weight:700">$&</span>');
  html = html.replace(/低风险|安全|买入|加仓/g, '<span style="color:#16c784;font-weight:700">$&</span>');
  // 列表
  html = html.replace(/^- (.+)$/gm, '<div style="padding:2px 0 2px 12px;border-left:2px solid #30363d;margin:3px 0;font-size:13px">$1</div>');
  html = html.replace(/^\d+\. (.+)$/gm, '<div style="padding:2px 0 2px 12px;margin:3px 0;font-size:13px">$1</div>');
  // 分隔线
  html = html.replace(/^---$/gm, '<hr style="border-color:#21262d;margin:16px 0">');
  // 换行
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  const timestamp = new Date().toLocaleString('zh-CN');
  return `<div class="card" style="border-color:#58a6ff">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="card-title" style="margin:0">🧠 ${name||code} — AI深度分析报告</div>
      <span style="font-size:11px;color:#8b949e">${timestamp}</span>
    </div>
    <div style="line-height:1.7;color:#c9d1d9">${html}</div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #21262d;display:flex;gap:8px">
      <button class="btn btn-primary btn-sm" onclick="addToWatchlist('${code}','${name||''}','${price||''}','AI智能体分析推荐')">加入自选股</button>
      <button class="btn btn-blue btn-sm" onclick="startAIAnalysis()">重新分析</button>
    </div>
  </div>`;
}
