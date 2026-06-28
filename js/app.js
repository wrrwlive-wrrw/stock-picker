// 选股指导系统 - 主逻辑
let currentUser = null;

// 账号配置
const ACCOUNTS = [
  {username:'admin',password:'admin123',role:'admin',name:'管理员'},
  {username:'user',password:'123456',role:'user',name:'普通用户'},
  {username:'vip',password:'vip888',role:'vip',name:'VIP用户'}
];

// 菜单配置（按角色）
const MENUS = {
  admin: [
    {id:'market',label:'🏠 大盘总览'},
    {id:'watchlist',label:'⭐ 自选股'},
    {id:'methodology',label:'📖 选股方法论'},
    {id:'macro',label:'🌍 宏观分析'},
    {id:'query',label:'🔍 个股查询'},
    {id:'strategy',label:'⚙️ 策略工具'},
    {id:'recommend',label:'💡 投资建议'},
    {id:'users',label:'👥 用户管理'},
  ],
  vip: [
    {id:'market',label:'🏠 大盘总览'},
    {id:'watchlist',label:'⭐ 自选股'},
    {id:'methodology',label:'📖 选股方法论'},
    {id:'macro',label:'🌍 宏观分析'},
    {id:'query',label:'🔍 个股查询'},
    {id:'strategy',label:'⚙️ 策略工具'},
    {id:'recommend',label:'💡 投资建议'},
  ],
  user: [
    {id:'market',label:'🏠 大盘总览'},
    {id:'watchlist',label:'⭐ 自选股'},
    {id:'methodology',label:'📖 选股方法论'},
    {id:'macro',label:'🌍 宏观分析'},
    {id:'query',label:'🔍 个股查询'},
  ]
};

// 登录
function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPwd').value.trim();
  if (!u || !p) { alert('请输入账号和密码'); return; }
  const allAccounts = JSON.parse(localStorage.getItem('stock_accounts')||'null') || ACCOUNTS;
  const acc = allAccounts.find(a => a.username === u && a.password === p);
  if (!acc) { alert('账号或密码错误'); return; }
  currentUser = acc;
  localStorage.setItem('stock_current_user', JSON.stringify(acc));
  showMain();
}

function doLogout() {
  currentUser = null;
  localStorage.removeItem('stock_current_user');
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('topNav').style.display = 'none';
  document.getElementById('appContainer').style.display = 'none';
}

// 显示主界面
function showMain() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('topNav').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'flex';
  const roleLabel = {admin:'管理员',vip:'VIP用户',user:'普通用户'}[currentUser.role];
  document.getElementById('userInfo').textContent = `${currentUser.name}（${roleLabel}）`;
  renderSidebar();
  navigate('market');
}

// 渲染侧边栏
function renderSidebar() {
  const menus = MENUS[currentUser.role] || MENUS.user;
  document.getElementById('sidebar').innerHTML = menus.map(m =>
    `<div class="menu-item" data-page="${m.id}" onclick="navigate('${m.id}')">${m.label}</div>`
  ).join('');
}

// 路由
function navigate(page) {
  document.querySelectorAll('.menu-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const content = document.getElementById('mainContent');
  switch(page) {
    case 'market': renderMarket(content); break;
    case 'watchlist': renderWatchlist(content); break;
    case 'methodology': renderMethodology(content); break;
    case 'macro': renderMacro(content); break;
    case 'query': renderStockQuery(content); break;
    case 'strategy': renderStrategy(content); break;
    case 'recommend': renderRecommend(content); break;
    case 'users': renderUserManage(content); break;
  }
}

function updateMarketTime() {
  const now = new Date();
  const str = now.toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const el = document.getElementById('marketTime');
  if (el) el.textContent = str;
}

// 初始化
window.onload = function() {
  updateMarketTime();
  setInterval(updateMarketTime, 1000);
  const saved = localStorage.getItem('stock_current_user');
  if (saved) { currentUser = JSON.parse(saved); showMain(); }
};

// 用户管理（仅管理员可见）
function renderUserManage(el) {
  if (currentUser.role !== 'admin') { el.innerHTML = '<div class="card"><p>无权限</p></div>'; return; }
  const accounts = JSON.parse(localStorage.getItem('stock_accounts')||'null') || ACCOUNTS;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">用户管理</div>
      <div class="toolbar">
        <button class="btn btn-primary" onclick="showAddUser()">添加用户</button>
      </div>
      <table class="data-table">
        <tr><th>账号</th><th>姓名</th><th>角色</th><th>操作</th></tr>
        ${accounts.map((a,i)=>`<tr>
          <td>${a.username}</td><td>${a.name}</td>
          <td>${{admin:'管理员',vip:'VIP用户',user:'普通用户'}[a.role]}</td>
          <td>${a.username==='admin'?'—':`<button class="btn btn-danger btn-sm" onclick="deleteUser(${i})">删除</button> <button class="btn btn-blue btn-sm" onclick="resetPwd(${i})">重置密码</button>`}</td>
        </tr>`).join('')}
      </table>
    </div>`;
}

function showAddUser() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box">
    <div class="modal-title">添加用户</div>
    <div class="form-group"><label>账号</label><input id="newUsername" style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px"></div>
    <div class="form-group"><label>姓名</label><input id="newName" style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px"></div>
    <div class="form-group"><label>密码</label><input id="newPwd" value="123456" style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px"></div>
    <div class="form-group"><label>角色</label><select id="newRole" style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;color:#e6e6e6;border-radius:4px">
      <option value="user">普通用户</option><option value="vip">VIP用户</option><option value="admin">管理员</option>
    </select></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
      <button class="btn" style="background:#30363d;color:#e6e6e6" onclick="this.closest('.modal-overlay').remove()">取消</button>
      <button class="btn btn-primary" onclick="doAddUser()">确认添加</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function doAddUser() {
  const username = document.getElementById('newUsername').value.trim();
  const name = document.getElementById('newName').value.trim();
  const password = document.getElementById('newPwd').value.trim();
  const role = document.getElementById('newRole').value;
  if (!username || !name) { alert('请填写完整'); return; }
  const accounts = JSON.parse(localStorage.getItem('stock_accounts')||'null') || [...ACCOUNTS];
  if (accounts.find(a=>a.username===username)) { alert('账号已存在'); return; }
  accounts.push({username, password: password||'123456', role, name});
  localStorage.setItem('stock_accounts', JSON.stringify(accounts));
  document.querySelector('.modal-overlay')?.remove();
  renderUserManage(document.getElementById('mainContent'));
}

function deleteUser(idx) {
  if (!confirm('确定删除该用户？')) return;
  const accounts = JSON.parse(localStorage.getItem('stock_accounts')||'null') || [...ACCOUNTS];
  accounts.splice(idx, 1);
  localStorage.setItem('stock_accounts', JSON.stringify(accounts));
  renderUserManage(document.getElementById('mainContent'));
}

function resetPwd(idx) {
  const newPwd = prompt('输入新密码：', '123456');
  if (!newPwd) return;
  const accounts = JSON.parse(localStorage.getItem('stock_accounts')||'null') || [...ACCOUNTS];
  accounts[idx].password = newPwd;
  localStorage.setItem('stock_accounts', JSON.stringify(accounts));
  alert('密码已重置');
}
