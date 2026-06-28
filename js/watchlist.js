// 自选股模块
function getWatchlist() {
  const key = 'stock_watchlist_' + (currentUser?.username || 'guest');
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveWatchlist(list) {
  const key = 'stock_watchlist_' + (currentUser?.username || 'guest');
  localStorage.setItem(key, JSON.stringify(list));
}

// 添加自选股
function addToWatchlist(code, name, price, reason) {
  const list = getWatchlist();
  if (list.find(s => s.code === code)) { alert(name + ' 已在自选股中'); return; }
  list.push({
    code, name, price,
    reason: reason || '',
    addDate: new Date().toISOString().slice(0, 10),
    addPrice: price
  });
  saveWatchlist(list);
  alert(name + ' 已加入自选股');
}

// 移除自选股
function removeFromWatchlist(code) {
  let list = getWatchlist();
  list = list.filter(s => s.code !== code);
  saveWatchlist(list);
  renderWatchlist(document.getElementById('mainContent'));
}

// 渲染自选股页面
function renderWatchlist(el) {
  const list = getWatchlist();
  el.innerHTML = `
    <div class="card">
      <div class="card-title">我的自选股</div>
      <div class="toolbar">
        <input type="text" id="watchAddCode" placeholder="股票代码 如sh600519" style="width:160px">
        <input type="text" id="watchAddName" placeholder="名称" style="width:100px">
        <input type="text" id="watchAddPrice" placeholder="现价" style="width:80px">
        <button class="btn btn-primary" onclick="manualAddWatch()">手动添加</button>
        <button class="btn btn-blue" onclick="addRecommendStocks()">一键导入推荐股</button>
      </div>
    </div>
    <div class="card">
      ${list.length ? renderWatchTable(list) : '<p style="color:#8b949e">暂无自选股，可手动添加或从投资建议页导入</p>'}
    </div>
  `;
}

function renderWatchTable(list) {
  return `<table class="data-table">
    <tr><th>代码</th><th>名称</th><th>现价</th><th>加入价</th><th>盈亏</th><th>加入日期</th><th>备注</th><th>操作</th></tr>
    ${list.map(s => {
      const cur = parseFloat(s.price) || 0;
      const add = parseFloat(s.addPrice) || cur;
      const pnl = add > 0 ? ((cur - add) / add * 100).toFixed(2) : '0.00';
      const cls = pnl > 0 ? 'up' : pnl < 0 ? 'down' : 'flat';
      return `<tr>
        <td>${s.code}</td><td><b>${s.name}</b></td><td>${s.price}</td>
        <td>${s.addPrice}</td><td class="${cls}">${pnl > 0 ? '+' : ''}${pnl}%</td>
        <td>${s.addDate}</td><td style="font-size:11px;max-width:150px">${s.reason||'—'}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeFromWatchlist('${s.code}')">移除</button></td>
      </tr>`;
    }).join('')}
  </table>`;
}

function manualAddWatch() {
  const code = document.getElementById('watchAddCode').value.trim();
  const name = document.getElementById('watchAddName').value.trim();
  const price = document.getElementById('watchAddPrice').value.trim();
  if (!code || !name) { alert('请输入代码和名称'); return; }
  addToWatchlist(code, name, price || '—', '手动添加');
  renderWatchlist(document.getElementById('mainContent'));
}

// 一键导入推荐股票
function addRecommendStocks() {
  const recommends = [
    {code:'sh600519',name:'贵州茅台',price:'1756',reason:'白酒龙头，ROE>30%'},
    {code:'sz300750',name:'宁德时代',price:'218.5',reason:'动力电池全球龙头'},
    {code:'sz002594',name:'比亚迪',price:'285.6',reason:'新能源车龙头，智驾+出海'},
    {code:'sh601012',name:'隆基绿能',price:'25.8',reason:'光伏龙头超跌反弹'},
    {code:'sh688981',name:'中芯国际',price:'78.9',reason:'半导体国产替代核心'},
    {code:'sz002371',name:'北方华创',price:'345',reason:'半导体设备龙头'},
    {code:'sh603501',name:'韦尔股份',price:'98.5',reason:'CIS芯片龙头'},
    {code:'sz000333',name:'美的集团',price:'68.3',reason:'家电白马，稳定分红'},
  ];
  const list = getWatchlist();
  let added = 0;
  recommends.forEach(r => {
    if (!list.find(s => s.code === r.code)) {
      list.push({...r, addDate: new Date().toISOString().slice(0,10), addPrice: r.price});
      added++;
    }
  });
  saveWatchlist(list);
  alert(`已导入 ${added} 只推荐股票（跳过已存在的）`);
  renderWatchlist(document.getElementById('mainContent'));
}
