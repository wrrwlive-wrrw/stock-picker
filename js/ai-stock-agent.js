// AI选股智能体模块 — 独立API配置

// === 独立API配置（agent专用，不与每日分析共享） ===
function getAgentProvider() {
  return localStorage.getItem('agent_provider') || getAIProvider();
}
function setAgentProvider(p) {
  localStorage.setItem('agent_provider', p);
}
function getAgentAIConfig() {
  const provider = getAgentProvider();
  const cfg = AI_PROVIDERS[provider] || AI_PROVIDERS.siliconflow;
  return { provider, url: cfg.url, model: cfg.model, ...cfg };
}
function getAgentKey() {
  return localStorage.getItem('agent_api_key') || getAIKey();
}
function saveAgentKey(k) {
  localStorage.setItem('agent_api_key', k);
}

function renderAIAgent(el) {
  const agentKey = getAgentKey();
  const agentCfg = getAgentAIConfig();
  const keyMask = agentKey ? agentKey.slice(0,6)+'****'+agentKey.slice(-4) : '未配置';
  el.innerHTML = `
    <div class="card">
      <div class="card-title">🧠 AI选股智能体</div>
      <p style="color:#8b949e;font-size:13px">输入股票代码或名称，AI将从技术面、基本面、资金面、消息面、行业对比五大维度进行全面深度分析，给出风险预警和买卖建议。</p>
      <div style="margin-top:8px;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:4px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
          <span style="font-size:12px;color:#8b949e">智能体AI：</span>
          <select id="agentProviderSelect" onchange="switchAgentProvider()" style="padding:5px 8px;background:#161b22;border:1px solid #30363d;color:#e6e6e6;border-radius:4px;font-size:12px">
            <option value="siliconflow" ${getAgentProvider()==='siliconflow'?'selected':''}>硅基流动 (Qwen3-32B)</option>
            <option value="bailian" ${getAgentProvider()==='bailian'?'selected':''}>阿里云百炼 (通义千问)</option>
            <option value="zhipu" ${getAgentProvider()==='zhipu'?'selected':''}>智谱AI (GLM-4-Flash)</option>
            <option value="groq" ${getAgentProvider()==='groq'?'selected':''}>Groq (Llama-3.3-70B)</option>
            <option value="openrouter" ${getAgentProvider()==='openrouter'?'selected':''}>OpenRouter (多模型免费)</option>
          </select>
        </div>
        <div style="font-size:12px;color:#8b949e;margin-bottom:6px">
          当前：<span style="color:#58a6ff">${agentCfg.name}</span> | Key：<span style="color:#58a6ff">${keyMask}</span>
          （<a href="${agentCfg.keyUrl}" target="_blank" style="color:#58a6ff">${agentCfg.keyHint}</a>）
        </div>
        <div style="display:flex;gap:6px">
          <input type="password" id="agentKeyInput" placeholder="${agentCfg.keyPlaceholder}" style="flex:1;padding:6px;background:#161b22;border:1px solid #30363d;color:#e6e6e6;border-radius:4px;font-size:12px">
          <button class="btn btn-blue btn-sm" onclick="setAgentKeyUI()">保存Key</button>
          <button class="btn btn-sm" style="background:#f0883e;color:#fff" onclick="testAgentConnection()">测试连接</button>
        </div>
        <div id="agentTestResult" style="margin-top:6px;font-size:12px"></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="text" id="aiAgentCode" placeholder="股票代码 如 sh600519" style="width:160px;padding:8px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px">
        <input type="text" id="aiAgentName" placeholder="名称(可选)" style="width:120px;padding:8px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px">
        <button class="btn btn-primary" onclick="startAIAnalysis()" id="aiAgentBtn">开始深度分析</button>
        <span style="font-size:12px;color:#8b949e" id="aiAgentStatus">${agentKey ? '输入代码后点击分析' : '请先配置智能体API Key'}</span>
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

function switchAgentProvider() {
  const sel = document.getElementById('agentProviderSelect');
  if (!sel) return;
  setAgentProvider(sel.value);
  renderAIAgent(document.getElementById('mainContent'));
}

function setAgentKeyUI() {
  const v = document.getElementById('agentKeyInput').value.trim();
  if (!v) { alert('请输入API Key'); return; }
  const provider = getAgentProvider();
  const keyPatterns = {
    siliconflow: /^sk-/,
    zhipu: /^.+/,
    groq: /^gsk_/,
    openrouter: /^sk-or-/
  };
  const pattern = keyPatterns[provider];
  if (pattern && !pattern.test(v)) {
    alert(`Key格式不匹配：${getAgentAIConfig().keyHint}`);
    return;
  }
  saveAgentKey(v);
  document.getElementById('agentKeyInput').value = '';
  alert('智能体API Key已保存！');
  renderAIAgent(document.getElementById('mainContent'));
}

async function testAgentConnection() {
  const key = getAgentKey();
  if (!key) { alert('请先保存智能体API Key'); return; }
  const cfg = getAgentAIConfig();
  const resultEl = document.getElementById('agentTestResult');
  const startTime = Date.now();
  resultEl.innerHTML = '<span style="color:#d29922">⏳ 测试连接中...</span>';
  try {
    const body = {
      model: cfg.model,
      messages: [{ role: 'user', content: '回复"OK"' }],
      max_tokens: 10
    };
    if (getAgentProvider() === 'siliconflow') body.enable_thinking = false;
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
      resultEl.innerHTML = `<span style="color:#ea3943">❌ 连接失败: ${errMsg}</span>${errText ? '<br><span style="color:#8b949e;font-size:11px">'+errText.slice(0,120)+'</span>' : ''}`;
    }
  } catch(e) {
    const elapsed = Date.now() - startTime;
    let errMsg = e.message || '未知错误';
    if (e.name === 'TimeoutError') errMsg = '连接超时(15s)';
    else if (e.name === 'TypeError') errMsg = '网络错误';
    resultEl.innerHTML = `<span style="color:#ea3943">❌ 连接失败 (${elapsed}ms): ${errMsg}</span>`;
  }
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

  const apiKey = getAgentKey();
  if (!apiKey) { alert('请先在智能体页面配置API Key'); return; }

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

  // 用API返回的真实名称始终更新name（API数据最准确）
  if (quoteData.name) name = quoteData.name;
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
  const watchStock2 = (typeof getWatchlist === 'function') ? getWatchlist().find(s => s.code === code) : null;
  const prompt = buildStockAgentPrompt(code, name, quoteData, capitalData, marketData, watchStock2);
  try {
    const aiCfg = typeof getAgentAIConfig === 'function' ? getAgentAIConfig() : { url: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen3-32B' };
    const body = {
      model: aiCfg.model,
      temperature: 0.4,
      max_tokens: 6000,
      messages: [
        { role: 'system', content: getStockAgentSystemPrompt() },
        { role: 'user', content: prompt }
      ]
    };
    if (typeof getAgentProvider === 'function' && getAgentProvider() === 'siliconflow') body.enable_thinking = false;
    const res = await fetch(aiCfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('AI API错误', res.status, errText);
      let errMsg = '状态码 ' + res.status;
      if (res.status === 401) errMsg = 'API Key无效或已过期（请重新保存Key）';
      else if (res.status === 429) errMsg = '调用频率超限，请稍后再试';
      else if (res.status === 403) errMsg = 'API Key权限不足或余额不足';
      else if (res.status === 400) errMsg = '请求参数错误：' + errText.slice(0,100);
      throw new Error(errMsg + (errText ? ' — ' + errText.slice(0,150) : ''));
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
      <p style="color:#8b949e;font-size:12px;margin-top:8px">请检查智能体API Key是否有效，或稍后重试</p>
    </div>`;
    status.textContent = 'AI调用失败';
  }
  btn.disabled = false;
}

// 从弹窗直接调用的AI分析（不依赖DOM元素）
async function startAIAnalysisDirect(code, name) {
  const apiKey = getAgentKey();
  if (!apiKey) { alert('请先在智能体页面配置API Key'); return; }

  // 在弹窗中显示分析状态
  const modal = document.getElementById('stockDetailModal');
  if (!modal) { alert('弹窗已关闭，请重新打开'); return; }

  // 插入加载提示
  let loadDiv = document.getElementById('aiDirectLoading');
  if (loadDiv) loadDiv.remove();
  loadDiv = document.createElement('div');
  loadDiv.id = 'aiDirectLoading';
  loadDiv.style.cssText = 'margin-top:16px;padding:16px;background:#161b22;border-radius:8px;border:1px solid #1f6feb;text-align:center';
  loadDiv.innerHTML = '<p style="color:#58a6ff;font-size:15px">🧠 AI深度分析启动中...</p><p style="color:#8b949e;font-size:12px" id="aiDirectStatus">正在获取行情数据...</p>';
  modal.appendChild(loadDiv);
  loadDiv.scrollIntoView({ behavior: 'smooth' });

  const statusEl = document.getElementById('aiDirectStatus');

  // 第一步：获取行情
  statusEl.textContent = '正在获取实时行情...';
  let quoteData = null;
  try { quoteData = await fetchAStockQuote(code); } catch(e) {}
  quoteData = quoteData || SAMPLE_STOCKS[code] || null;

  if (!quoteData) {
    loadDiv.innerHTML = '<p style="color:#ea3943">⚠️ 无法获取该股票行情数据</p>';
    return;
  }
  if (quoteData.name) name = quoteData.name;
  statusEl.textContent = `${name}（${code}）行情获取成功，AI分析中...`;

  // 第二步：获取资金流
  let capitalData = null;
  try { capitalData = await fetchEMCapitalFlow(code); } catch(e) {}

  // 第三步：获取大盘
  let marketData = null;
  try { marketData = await fetchIndexData(); } catch(e) {}

  statusEl.textContent = 'AI深度分析中，请稍候（约15-30秒）...';

  // 第四步：调用AI
  const watchStock = (typeof getWatchlist === 'function') ? getWatchlist().find(s => s.code === code) : null;
  const prompt = buildStockAgentPrompt(code, name, quoteData, capitalData, marketData, watchStock);
  try {
    const aiCfg2 = typeof getAgentAIConfig === 'function' ? getAgentAIConfig() : { url: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen3-32B' };
    const body2 = {
      model: aiCfg2.model,
      temperature: 0.4,
      max_tokens: 6000,
      messages: [
        { role: 'system', content: getStockAgentSystemPrompt() },
        { role: 'user', content: prompt }
      ]
    };
    if (typeof getAgentProvider === 'function' && getAgentProvider() === 'siliconflow') body2.enable_thinking = false;
    const res = await fetch(aiCfg2.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(body2)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('AI API错误', res.status, errText);
      let errMsg = '状态码 ' + res.status;
      if (res.status === 401) errMsg = 'API Key无效或已过期（请重新保存Key）';
      else if (res.status === 429) errMsg = '调用频率超限，请稍后再试';
      else if (res.status === 403) errMsg = 'API Key权限不足';
      throw new Error(errMsg);
    }
    const data = await res.json();
    let text = data.choices?.[0]?.message?.content || '';
    text = cleanAIResponse(text);
    if (!text) throw new Error('AI返回内容为空');
    const price = quoteData?.price || '';
    loadDiv.innerHTML = renderAIAgentReport(text, code, name, price);
  } catch(e) {
    console.error('AI分析失败', e);
    loadDiv.innerHTML = `<div style="border:1px solid #da3633;border-radius:8px;padding:16px">
      <p style="color:#ea3943;font-weight:bold">分析失败</p>
      <p style="color:#ea3943;font-size:13px">${e.message || e}</p>
      <p style="color:#8b949e;font-size:12px;margin-top:8px">请检查API Key是否有效，或稍后重试</p>
    </div>`;
  }
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
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long'});
  const timeStr = now.toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'});
  return `你是一位全能型A股投研分析师，拥有20年实战经验。你的分析框架融合了：
- 东方财富的数据体系
- 同花顺的技术分析
- 英为财情的全球联动视角
- 机构级的基本面研究方法
- 宏观经济与地缘政治研究能力

⚠️ 重要：当前真实日期是 ${dateStr} ${timeStr}。你必须基于这个日期做分析，不要使用其他日期。如果数据中包含日期，请以数据中的日期为准。

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
function buildStockAgentPrompt(code, name, quote, capital, market, watchStock) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long'});
  const timeStr = now.toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  let dataSection = `📅 当前真实日期：${dateStr} ${timeStr}（请基于此日期分析，不要使用其他日期）
⚠️ 以下数据均为实时获取的最新数据，请以此为准进行分析。\n`;
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

  // 持仓信息
  if (watchStock) {
    const cost = parseFloat(watchStock.costPrice) || parseFloat(watchStock.addPrice) || 0;
    const cur = parseFloat(quote?.price) || 0;
    const pnl = cost > 0 && cur > 0 ? ((cur - cost) / cost * 100).toFixed(2) : '—';
    dataSection += `\n\n【持仓信息】
- 成本价：${watchStock.costPrice || watchStock.addPrice || '—'}
- 当前盈亏：${pnl !== '—' ? (pnl >= 0 ? '+' : '') + pnl + '%' : '—'}
- 目标价：${watchStock.targetPrice || '未设置'}
- 止损价：${watchStock.stopLoss || '未设置'}
- 选股理由：${watchStock.reason || '—'}
- 选股方法：${(watchStock.methods || []).join('、') || '—'}`;
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

## 九、行业周期与企业基本面综合分析
1. 行业当前所处周期阶段（萌芽/成长/成熟/衰退）及未来趋势判断
2. 行业竞争格局（集中度变化、新进入者威胁、替代品风险）
3. 企业核心竞争力（护城河类型：品牌/技术/规模/网络效应）
4. 企业战略方向是否与行业趋势一致
5. 管理层执行力评估

## 十、持仓盈亏分析与持有/卖出建议（核心）
基于以下维度综合给出明确的持有或卖出建议：
1. **成本价分析**：当前价vs成本价，盈亏状态及趋势判断
2. **估值合理性**：当前估值在行业中的位置，是否存在泡沫
3. **资金面信号**：主力资金流向是否支持继续持有
4. **技术面位置**：当前股价所处位置（底部/中部/顶部）
5. **行业景气度**：行业周期是否支持长期持有
6. **企业基本面**：盈利能力、成长性、财务健康度

**输出要求**：必须明确给出以下之一：
- 🟢 **建议持有**：给出持有理由和目标价
- 🟡 **建议减仓**：给出减仓比例和时机
- 🔴 **建议清仓**：给出清仓理由和止损价

## 十一、分阶段交易策略
| 项目 | 建议 |
|------|------|
| 当前操作 | 持有/减仓/清仓 |
| 短线策略(1-2周) | 具体操作和目标价 |
| 中线策略(1-3月) | 具体操作和目标价 |
| 长线策略(3-12月) | 具体操作和目标价 |
| 首次建仓价 | 具体价格 |
| 加仓价位 | 第一加仓/第二加仓 |
| 目标价 | 第一目标/第二目标/第三目标 |
| 止损价 | 具体价格 |
| 仓位建议 | 初始仓位%→加仓后% |
| 最佳买入时机 | 具体条件描述 |

## 十二、总结与下一步行动
1. 3条核心结论
2. 当前最优操作（立即可执行）
3. 未来一周关注的关键事件/数据
4. 触发买入/卖出的信号条件

---
*免责声明：AI分析仅供参考，不构成投资建议。股市有风险，入市需谨慎。*`;
}

// 渲染AI分析报告为HTML
function renderAIAgentReport(text, code, name, price) {
  // 转义字符串用于JS内嵌
  const esc = s => String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
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
      <button class="btn btn-primary btn-sm" onclick="addToWatchlist('${esc(code)}','${esc(name)}','${esc(price)}','AI智能体分析推荐')">加入自选股</button>
      <button class="btn btn-blue btn-sm" onclick="startAIAnalysis()">重新分析</button>
    </div>
  </div>`;
}
