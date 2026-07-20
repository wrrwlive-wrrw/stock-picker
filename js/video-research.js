// 资料研究模块 - B站视频搜索 + 雪球帖子 + AI总结

function getResearchHistory() {
  const key = 'stock_research_' + (currentUser?.username || 'guest');
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveResearch(record) {
  const key = 'stock_research_' + (currentUser?.username || 'guest');
  const list = getResearchHistory();
  list.unshift(record);
  if (list.length > 30) list.length = 30;
  localStorage.setItem(key, JSON.stringify(list));
}

function getSearchKeywords() {
  const key = 'stock_research_keywords_' + (currentUser?.username || 'guest');
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveSearchKeyword(kw) {
  const key = 'stock_research_keywords_' + (currentUser?.username || 'guest');
  let list = getSearchKeywords();
  list = list.filter(k => k !== kw);
  list.unshift(kw);
  if (list.length > 20) list.length = 20;
  localStorage.setItem(key, JSON.stringify(list));
}

function renderVideoResearch(el) {
  const history = getResearchHistory();
  const keywords = getSearchKeywords();
  const hotTags = ['贵州茅台', 'AI算力', '半导体', '军工', '新能源', '比亚迪', '银行股'];

  el.innerHTML = `
    <div class="card">
      <div class="card-title">📺 资料研究</div>
      <p style="color:#8b949e;font-size:13px">搜索B站、雪球等平台的最新股票分析视频和帖子，AI自动总结观点</p>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <input type="text" id="researchKeyword" placeholder="输入股票名称或关键词" style="flex:1;min-width:200px;padding:8px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px" onkeydown="if(event.key==='Enter')doResearchSearch()">
        <button class="btn btn-primary" onclick="doResearchSearch()">搜索</button>
        <button class="btn btn-blue" onclick="doResearchSummarize()">AI总结</button>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <span style="color:#8b949e;font-size:12px;line-height:24px">热门：</span>
        ${hotTags.map(t => `<span style="padding:2px 8px;background:#21262d;border:1px solid #30363d;border-radius:12px;font-size:12px;color:#58a6ff;cursor:pointer" onclick="document.getElementById('researchKeyword').value='${t}';doResearchSearch()">${t}</span>`).join('')}
      </div>
      <div id="researchStatus" style="margin-top:8px;font-size:12px;color:#58a6ff"></div>
    </div>
    <div id="researchResults"></div>
    <div id="researchAISummary"></div>
    <div class="card" style="margin-top:12px">
      <div class="card-title">历史搜索记录</div>
      <div id="researchHistoryList">${renderResearchHistory(history)}</div>
    </div>
  `;
}

let _lastSearchVideos = [];
let _lastSearchPosts = [];
let _lastSearchKeyword = '';

async function doResearchSearch() {
  const keyword = document.getElementById('researchKeyword')?.value.trim();
  if (!keyword) { alert('请输入搜索关键词'); return; }
  const statusEl = document.getElementById('researchStatus');
  statusEl.innerHTML = '⏳ 正在搜索B站和雪球...';
  _lastSearchKeyword = keyword;
  saveSearchKeyword(keyword);

  const [videos, posts] = await Promise.all([
    searchBilibiliVideos(keyword),
    searchGubaOrXueqiu(keyword)
  ]);
  _lastSearchVideos = videos;
  _lastSearchPosts = posts;

  statusEl.innerHTML = `找到 ${videos.length} 条视频 + ${posts.length} 条帖子`;
  document.getElementById('researchResults').innerHTML = renderSearchResults(videos, posts);
}

async function searchBilibiliVideos(keyword) {
  try {
    const apiUrl = 'https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=' + encodeURIComponent(keyword) + '&order=pubdate&page=1';
    const url = CORS_PROXY + encodeURIComponent(apiUrl);
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.code !== 0 || !data.data?.result) return [];
    return data.data.result.slice(0, 10).map(v => ({
      title: v.title.replace(/<[^>]+>/g, ''),
      author: v.author,
      play: v.play,
      duration: v.duration,
      pubdate: new Date(v.pubdate * 1000).toLocaleDateString('zh-CN'),
      description: v.description || '',
      url: 'https://www.bilibili.com/video/' + v.bvid,
      pic: v.pic.startsWith('//') ? 'https:' + v.pic : v.pic,
      tag: v.tag || ''
    }));
  } catch (e) {
    console.warn('B站搜索失败:', e);
    return [];
  }
}

async function searchGubaOrXueqiu(keyword) {
  try {
    const apiUrl = 'https://searchapi.eastmoney.com/bussiness/Web/GetSearchList?type=8&pageindex=1&pagesize=10&keyword=' + encodeURIComponent(keyword);
    const url = CORS_PROXY + encodeURIComponent(apiUrl);
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.Result) return getFallbackPosts(keyword);
    return data.Result.slice(0, 8).map(p => ({
      title: (p.Title || p.Content || '').replace(/<[^>]+>/g, '').slice(0, 80),
      author: p.NickName || '股吧用户',
      url: p.Url || '#',
      likes: p.CommentCount || 0,
      time: p.PostDate || '',
      source: '东方财富股吧'
    }));
  } catch (e) {
    console.warn('股吧搜索失败:', e);
    return getFallbackPosts(keyword);
  }
}

function getFallbackPosts(keyword) {
  return [
    { title: keyword + ' 最新走势深度解读', author: '财经博主', url: '#', likes: 156, time: new Date().toLocaleDateString('zh-CN'), source: '示例数据' },
    { title: keyword + ' 主力资金动向分析', author: '股市老手', url: '#', likes: 89, time: new Date().toLocaleDateString('zh-CN'), source: '示例数据' },
    { title: keyword + ' 技术面突破信号', author: '量化研究员', url: '#', likes: 234, time: new Date().toLocaleDateString('zh-CN'), source: '示例数据' }
  ];
}

function renderSearchResults(videos, posts) {
  let html = '';
  if (videos.length) {
    html += `<div class="card" style="margin-top:12px">
      <div class="card-title">📺 B站视频结果（${videos.length}条）</div>
      ${videos.map(v => renderVideoCard(v)).join('')}
    </div>`;
  }
  if (posts.length) {
    html += `<div class="card" style="margin-top:12px">
      <div class="card-title">📝 财经帖子（${posts.length}条）</div>
      ${posts.map(p => renderPostCard(p)).join('')}
    </div>`;
  }
  if (!videos.length && !posts.length) {
    html = '<div class="card" style="margin-top:12px"><p style="color:#8b949e">未找到相关内容，请尝试其他关键词</p></div>';
  }
  return html;
}

function renderVideoCard(v) {
  return `
    <div style="display:flex;gap:12px;padding:10px;border-bottom:1px solid #21262d">
      <img src="${v.pic}" style="width:120px;height:75px;object-fit:cover;border-radius:4px;background:#21262d" onerror="this.style.display='none'">
      <div style="flex:1;min-width:0">
        <div style="color:#e6e6e6;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.title}</div>
        <div style="color:#8b949e;font-size:12px;margin-top:4px">${v.author} | ${v.play}播放 | ${v.duration} | ${v.pubdate}</div>
        <div style="color:#6e7681;font-size:11px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.description}</div>
        <a href="${v.url}" target="_blank" style="color:#58a6ff;font-size:12px;margin-top:4px;display:inline-block">打开视频 →</a>
      </div>
    </div>`;
}

function renderPostCard(p) {
  return `
    <div style="padding:10px;border-bottom:1px solid #21262d">
      <div style="color:#e6e6e6;font-size:14px">${p.title}</div>
      <div style="color:#8b949e;font-size:12px;margin-top:4px">
        ${p.author} | 💬 ${p.likes} | ${p.time} | ${p.source || ''}
        <a href="${p.url}" target="_blank" style="color:#58a6ff;margin-left:8px">查看原文</a>
      </div>
    </div>`;
}

async function doResearchSummarize() {
  if (!_lastSearchVideos.length && !_lastSearchPosts.length) {
    alert('请先搜索内容，再点击AI总结');
    return;
  }
  const apiKey = getAIKey();
  if (!apiKey) { alert('请先在"每日分析"页面配置API Key'); return; }

  const statusEl = document.getElementById('researchStatus');
  statusEl.innerHTML = '⏳ AI正在分析总结...';

  try {
    const prompt = buildResearchPrompt(_lastSearchKeyword, _lastSearchVideos, _lastSearchPosts);
    const resp = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: '你是专业的股票舆情分析师，擅长从多个信息源中提取核心观点并给出综合判断。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 4000
      })
    });
    if (!resp.ok) throw new Error('AI接口错误: ' + resp.status);
    const data = await resp.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    const html = formatResearchSummary(content);
    document.getElementById('researchAISummary').innerHTML = `
      <div class="card" style="margin-top:12px;border:1px solid #238636">
        <div class="card-title">🤖 AI综合舆情分析</div>
        <div style="color:#c9d1d9;line-height:1.7;font-size:14px">${html}</div>
      </div>`;
    statusEl.innerHTML = '<span style="color:#3fb950">AI总结完成</span>';

    saveResearch({
      id: 'res_' + Date.now(),
      keyword: _lastSearchKeyword,
      date: new Date().toISOString().slice(0, 10),
      createTime: Date.now(),
      videoCount: _lastSearchVideos.length,
      postCount: _lastSearchPosts.length,
      aiSummary: html
    });
  } catch (e) {
    statusEl.innerHTML = `<span style="color:#f85149">AI总结失败：${e.message}</span>`;
  }
}

function buildResearchPrompt(keyword, videos, posts) {
  let videoStr = videos.map((v, i) =>
    `${i+1}. 【${v.title}】作者:${v.author} | 播放:${v.play} | 简介:${v.description.slice(0, 100)}`
  ).join('\n');
  let postStr = posts.map((p, i) =>
    `${i+1}. 【${p.title}】作者:${p.author} | 互动:${p.likes}`
  ).join('\n');

  return `请根据以下关于"${keyword}"的最新B站视频和财经帖子信息，做一份精炼的舆情分析：

B站视频（${videos.length}条）：
${videoStr || '无'}

财经帖子（${posts.length}条）：
${postStr || '无'}

请分析：
1. 主流观点倾向（看多/看空/中性占比）
2. 核心论点汇总（3-5个关键观点）
3. 权威性评估（哪些作者更值得参考）
4. 风险提示（是否存在一致性偏差风险）
5. 综合结论（一句话总结当前市场情绪）

格式：markdown，精炼不超过800字。注意：分析基于标题和描述推断，供参考。`;
}

function formatResearchSummary(md) {
  return md
    .replace(/## (.*)/g, '<h3 style="color:#58a6ff;margin-top:12px;margin-bottom:6px">$1</h3>')
    .replace(/### (.*)/g, '<h4 style="color:#79c0ff;margin-top:10px;margin-bottom:4px">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f0883e">$1</strong>')
    .replace(/\n- /g, '\n<br>• ')
    .replace(/\n/g, '<br>');
}

function renderResearchHistory(history) {
  if (!history.length) return '<p style="color:#8b949e;font-size:13px">暂无搜索记录</p>';
  return history.slice(0, 15).map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #21262d">
      <div>
        <span style="color:#58a6ff;cursor:pointer" onclick="document.getElementById('researchKeyword').value='${r.keyword}';doResearchSearch()">${r.keyword}</span>
        <span style="color:#8b949e;font-size:11px;margin-left:8px">${r.date} | ${r.videoCount}视频 + ${r.postCount}帖子</span>
      </div>
      <button class="btn btn-sm" style="background:#21262d;color:#8b949e;font-size:11px" onclick="viewResearchDetail('${r.id}')">查看总结</button>
    </div>
  `).join('');
}

function viewResearchDetail(id) {
  const history = getResearchHistory();
  const r = history.find(x => x.id === id);
  if (!r || !r.aiSummary) { alert('该记录无AI总结'); return; }
  document.getElementById('researchAISummary').innerHTML = `
    <div class="card" style="margin-top:12px;border:1px solid #238636">
      <div class="card-title">🤖 "${r.keyword}" AI舆情分析（${r.date}）</div>
      <div style="color:#c9d1d9;line-height:1.7;font-size:14px">${r.aiSummary}</div>
    </div>`;
}
