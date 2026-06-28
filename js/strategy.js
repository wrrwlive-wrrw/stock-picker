// 选股策略工具模块
function renderStrategy(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-title">选股策略工具</div>
      <div class="tabs">
        <div class="tab active" onclick="showStrategyTab('smart')">综合遴选</div>
        <div class="tab" onclick="showStrategyTab('turnover')">换手率</div>
        <div class="tab" onclick="showStrategyTab('volume')">成交量</div>
        <div class="tab" onclick="showStrategyTab('capital')">主力资金</div>
        <div class="tab" onclick="showStrategyTab('ma')">均线系统</div>
        <div class="tab" onclick="showStrategyTab('custom')">自定义筛选</div>
      </div>
      <div id="strategyContent"></div>
    </div>
  `;
  showStrategyTab('smart');
}

function showStrategyTab(tab) {
  document.querySelectorAll('.card .tabs .tab').forEach(el => {
    const map = {smart:'综合',turnover:'换手',volume:'成交量',capital:'主力',ma:'均线',custom:'自定义'};
    el.classList.toggle('active', el.textContent.includes(map[tab]));
  });
  const content = document.getElementById('strategyContent');
  switch(tab) {
    case 'smart': content.innerHTML = getSmartPickContent(); break;
    case 'turnover': content.innerHTML = getTurnoverContent(); break;
    case 'volume': content.innerHTML = getVolumeContent(); break;
    case 'capital': content.innerHTML = getCapitalFlowContent(); break;
    case 'ma': content.innerHTML = getMAContent(); break;
    case 'custom': content.innerHTML = getCustomContent(); break;
  }
}

function getSmartPickContent() {
  const picks = [
    {code:'sz002594',name:'比亚迪',price:'285.60',turnover:'3.8%',volRatio:'1.85',
     capital:'+2.3亿',ma:'站上5/10/20日线',score:92,signal:'强势突破'},
    {code:'sh600519',name:'贵州茅台',price:'1756.00',turnover:'0.5%',volRatio:'1.42',
     capital:'+4.1亿',ma:'MA5上穿MA20',score:88,signal:'金叉确认'},
    {code:'sz300750',name:'宁德时代',price:'218.50',turnover:'2.1%',volRatio:'1.68',
     capital:'+1.8亿',ma:'多头排列',score:86,signal:'趋势延续'},
    {code:'sh688981',name:'中芯国际',price:'78.90',turnover:'4.2%',volRatio:'2.10',
     capital:'+3.5亿',ma:'突破20日线',score:85,signal:'放量突破'},
    {code:'sz000333',name:'美的集团',price:'68.30',turnover:'1.6%',volRatio:'1.35',
     capital:'+0.9亿',ma:'站稳10日线',score:82,signal:'温和放量'},
    {code:'sh601012',name:'隆基绿能',price:'25.80',turnover:'5.1%',volRatio:'2.45',
     capital:'+1.2亿',ma:'突破5/10日线',score:80,signal:'底部放量'},
    {code:'sz002371',name:'北方华创',price:'345.00',turnover:'2.8%',volRatio:'1.92',
     capital:'+2.6亿',ma:'多头排列',score:79,signal:'主力加仓'},
    {code:'sh603501',name:'韦尔股份',price:'98.50',turnover:'3.5%',volRatio:'1.76',
     capital:'+1.5亿',ma:'MA10上穿MA20',score:78,signal:'金叉放量'},
  ];
  return `<div class="method-section">
    <div class="tip-box">
      <b>综合遴选逻辑：</b>换手率3%-8%（活跃但不过热）+ 量比>1.5（放量）+ 主力净流入>0 + 均线多头排列/金叉。
      综合评分越高，各维度信号越一致，胜率越高。
    </div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>价格</th><th>换手率</th><th>量比</th><th>主力净流入</th><th>均线状态</th><th>评分</th><th>信号</th><th>自选</th></tr>
      ${picks.map(p=>`<tr>
        <td>${p.code}</td><td><b>${p.name}</b></td><td>${p.price}</td>
        <td>${p.turnover}</td><td>${p.volRatio}</td>
        <td class="up">${p.capital}</td><td>${p.ma}</td>
        <td><b class="up">${p.score}</b></td><td class="up">${p.signal}</td>
        <td><button class="btn btn-blue btn-sm" onclick="addToWatchlist('${p.code}','${p.name}','${p.price}','综合评分${p.score}')">+自选</button></td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function getTurnoverContent() {
  const stocks = [
    {code:'sh601012',name:'隆基绿能',price:'25.80',turnover:'5.1%',status:'活跃放量',days3:'4.2%→4.8%→5.1%',tip:'换手率连续递增，资金关注度提升'},
    {code:'sh688981',name:'中芯国际',price:'78.90',turnover:'4.2%',status:'温和活跃',days3:'3.1%→3.8%→4.2%',tip:'从低换手进入活跃区间，关注突破'},
    {code:'sz002594',name:'比亚迪',price:'285.60',turnover:'3.8%',status:'健康放量',days3:'2.5%→3.2%→3.8%',tip:'大盘股换手率>3%说明主力积极运作'},
    {code:'sz300059',name:'东方财富',price:'18.50',turnover:'6.5%',status:'高度活跃',days3:'4.5%→5.8%→6.5%',tip:'券商股换手率飙升，市场情绪回暖信号'},
    {code:'sz002371',name:'北方华创',price:'345.00',turnover:'2.8%',status:'开始活跃',days3:'1.5%→2.1%→2.8%',tip:'从缩量区突然放量，可能有新资金介入'},
  ];
  return `<div class="method-section">
    <div class="tip-box">
      <b>换手率选股逻辑：</b><br>
      • 换手率<1%：缩量冷门，暂不关注<br>
      • 换手率1%-3%：正常交投，观望为主<br>
      • <span class="up">换手率3%-7%：活跃区间，主力可能建仓或拉升（重点关注）</span><br>
      • 换手率>10%：过热，可能是主力对倒出货，谨慎<br>
      • 关键：换手率连续3天递增 + 股价上涨 = 强烈买入信号
    </div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>价格</th><th>今日换手</th><th>近3日趋势</th><th>状态</th><th>分析</th></tr>
      ${stocks.map(s=>`<tr>
        <td>${s.code}</td><td><b>${s.name}</b></td><td>${s.price}</td>
        <td class="up">${s.turnover}</td><td>${s.days3}</td>
        <td class="up">${s.status}</td><td style="font-size:11px">${s.tip}</td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function getVolumeContent() {
  const stocks = [
    {code:'sz002594',name:'比亚迪',price:'285.60',vol:'8.5万手',volRatio:'1.85',avg5:'4.6万手',signal:'较5日均量放大85%，突破前高',level:'强'},
    {code:'sh688981',name:'中芯国际',price:'78.90',vol:'12.3万手',volRatio:'2.10',avg5:'5.9万手',signal:'倍量突破20日线',level:'强'},
    {code:'sz300059',name:'东方财富',price:'18.50',vol:'45.6万手',volRatio:'2.20',avg5:'20.7万手',signal:'放量突破箱体上沿',level:'极强'},
    {code:'sh601012',name:'隆基绿能',price:'25.80',vol:'15.2万手',volRatio:'2.45',avg5:'6.2万手',signal:'底部倍量长阳，反转信号',level:'极强'},
    {code:'sz000333',name:'美的集团',price:'68.30',vol:'5.8万手',volRatio:'1.35',avg5:'4.3万手',signal:'温和放量站稳10日线',level:'中'},
  ];
  return `<div class="method-section">
    <div class="tip-box">
      <b>成交量选股逻辑：</b><br>
      • <b>量比>1.5：</b>明显放量，说明有新资金进入<br>
      • <b>量比>2.0：</b>显著放量，主力大概率在运作<br>
      • <b>底部放量：</b>长期缩量后突然放量 = 变盘信号（看涨）<br>
      • <b>高位放量：</b>连续大涨后放量滞涨 = 出货信号（看跌）<br>
      • 核心公式：<span class="up">缩量调整→放量突破→买入</span>
    </div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>价格</th><th>今日量</th><th>量比</th><th>5日均量</th><th>信号</th><th>强度</th></tr>
      ${stocks.map(s=>`<tr>
        <td>${s.code}</td><td><b>${s.name}</b></td><td>${s.price}</td>
        <td>${s.vol}</td><td class="up">${s.volRatio}</td><td>${s.avg5}</td>
        <td style="font-size:11px" class="up">${s.signal}</td>
        <td class="${s.level==='极强'?'up':'flat'}">${s.level}</td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function getCapitalFlowContent() {
  const stocks = [
    {code:'sh600519',name:'贵州茅台',price:'1756',main:'+4.1亿',super:'+2.8亿',big:'+1.3亿',retail:'-4.1亿',days5:'+15.6亿',signal:'主力持续流入'},
    {code:'sz002594',name:'比亚迪',price:'285.6',main:'+2.3亿',super:'+1.5亿',big:'+0.8亿',retail:'-2.3亿',days5:'+8.9亿',signal:'超大单主导'},
    {code:'sz300750',name:'宁德时代',price:'218.5',main:'+1.8亿',super:'+1.2亿',big:'+0.6亿',retail:'-1.8亿',days5:'+6.5亿',signal:'资金持续加仓'},
    {code:'sh688981',name:'中芯国际',price:'78.9',main:'+3.5亿',super:'+2.1亿',big:'+1.4亿',retail:'-3.5亿',days5:'+12.3亿',signal:'大资金抢筹'},
    {code:'sz002371',name:'北方华创',price:'345',main:'+2.6亿',super:'+1.8亿',big:'+0.8亿',retail:'-2.6亿',days5:'+9.8亿',signal:'机构建仓'},
    {code:'sh601012',name:'隆基绿能',price:'25.8',main:'+1.2亿',super:'+0.7亿',big:'+0.5亿',retail:'-1.2亿',days5:'+3.2亿',signal:'底部吸筹'},
  ];
  return `<div class="method-section">
    <div class="tip-box">
      <b>主力资金选股逻辑：</b><br>
      • <b>超大单（>100万）：</b>机构/游资主力行为<br>
      • <b>大单（20-100万）：</b>大户跟随行为<br>
      • <span class="up">主力净流入>0 且 连续3天以上 = 建仓信号</span><br>
      • 主力流入 + 散户流出 = 典型洗盘吸筹特征<br>
      • 5日累计净流入方向比单日更有参考价值
    </div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>价格</th><th>主力净流入</th><th>超大单</th><th>大单</th><th>散户</th><th>5日累计</th><th>判断</th></tr>
      ${stocks.map(s=>`<tr>
        <td>${s.code}</td><td><b>${s.name}</b></td><td>${s.price}</td>
        <td class="up">${s.main}</td><td class="up">${s.super}</td>
        <td class="up">${s.big}</td><td class="down">${s.retail}</td>
        <td class="up">${s.days5}</td><td class="up">${s.signal}</td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function getMAContent() {
  const stocks = [
    {code:'sz002594',name:'比亚迪',price:'285.6',ma5:'280.2',ma10:'275.8',ma20:'268.5',
     position:'价格>MA5>MA10>MA20',status:'完美多头排列',action:'持有/加仓'},
    {code:'sh600519',name:'贵州茅台',price:'1756',ma5:'1742',ma10:'1728',ma20:'1715',
     position:'MA5上穿MA20（金叉）',status:'金叉确认',action:'买入'},
    {code:'sz300750',name:'宁德时代',price:'218.5',ma5:'215.3',ma10:'212.8',ma20:'210.5',
     position:'价格>MA5>MA10>MA20',status:'多头排列',action:'持有'},
    {code:'sh601012',name:'隆基绿能',price:'25.8',ma5:'25.2',ma10:'24.8',ma20:'25.5',
     position:'突破MA5/MA10，逼近MA20',status:'底部反转中',action:'轻仓试探'},
    {code:'sh688981',name:'中芯国际',price:'78.9',ma5:'76.5',ma10:'75.2',ma20:'74.8',
     position:'放量站上MA20',status:'突破确认',action:'买入'},
    {code:'sz000333',name:'美的集团',price:'68.3',ma5:'67.8',ma10:'67.2',ma20:'66.5',
     position:'价格>MA5>MA10>MA20',status:'稳步上行',action:'持有'},
  ];
  return `<div class="method-section">
    <div class="tip-box">
      <b>均线系统选股逻辑：</b><br>
      • <b>MA5（5日线）：</b>短线趋势，价格站上MA5=短线看多<br>
      • <b>MA10（10日线）：</b>中短线趋势，跌破MA10短线离场<br>
      • <b>MA20（20日线）：</b>中线生命线，跌破MA20中线转空<br>
      • <span class="up">多头排列：MA5>MA10>MA20 = 强势上涨通道（重点买入）</span><br>
      • 金叉（MA5上穿MA10/MA20）= 趋势反转信号<br>
      • 死叉（MA5下穿MA10/MA20）= 离场信号
    </div>
    <table class="data-table" style="margin-top:12px">
      <tr><th>代码</th><th>名称</th><th>现价</th><th>MA5</th><th>MA10</th><th>MA20</th><th>均线位置</th><th>状态</th><th>操作建议</th></tr>
      ${stocks.map(s=>`<tr>
        <td>${s.code}</td><td><b>${s.name}</b></td><td>${s.price}</td>
        <td>${s.ma5}</td><td>${s.ma10}</td><td>${s.ma20}</td>
        <td style="font-size:11px">${s.position}</td>
        <td class="up">${s.status}</td><td class="up">${s.action}</td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function getCustomContent() {
  return `<div class="method-section">
    <h3>多维度自定义筛选</h3>
    <div class="toolbar" style="flex-wrap:wrap;gap:12px">
      <div><label style="font-size:12px;color:#8b949e">换手率：</label><input type="number" id="trMin" placeholder="最低%" style="width:60px"> - <input type="number" id="trMax" placeholder="最高%" style="width:60px"></div>
      <div><label style="font-size:12px;color:#8b949e">量比≥：</label><input type="number" id="volRatioMin" placeholder="1.5" style="width:60px"></div>
      <div><label style="font-size:12px;color:#8b949e">主力净流入≥：</label><input type="number" id="capitalMin" placeholder="亿" style="width:60px"></div>
      <div><label style="font-size:12px;color:#8b949e">均线状态：</label>
        <select id="maFilter">
          <option value="">全部</option>
          <option value="multi">多头排列</option>
          <option value="golden">金叉</option>
          <option value="above20">站上20日线</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="runCustomFilter()">筛选</button>
    </div>
    <div id="customResult" style="margin-top:12px">
      <p style="color:#8b949e;font-size:13px">设置条件后点击"筛选"（示例数据演示）</p>
    </div>
  </div>`;
}

function runCustomFilter() {
  const trMin = parseFloat(document.getElementById('trMin').value) || 0;
  const trMax = parseFloat(document.getElementById('trMax').value) || 99;
  const volRatioMin = parseFloat(document.getElementById('volRatioMin').value) || 0;
  const capitalMin = parseFloat(document.getElementById('capitalMin').value) || -99;
  const maFilter = document.getElementById('maFilter').value;
  const allStocks = [
    {code:'sz002594',name:'比亚迪',price:'285.6',turnover:3.8,volRatio:1.85,capital:2.3,ma:'multi',maLabel:'多头排列'},
    {code:'sh600519',name:'贵州茅台',price:'1756',turnover:0.5,volRatio:1.42,capital:4.1,ma:'golden',maLabel:'金叉'},
    {code:'sz300750',name:'宁德时代',price:'218.5',turnover:2.1,volRatio:1.68,capital:1.8,ma:'multi',maLabel:'多头排列'},
    {code:'sh688981',name:'中芯国际',price:'78.9',turnover:4.2,volRatio:2.10,capital:3.5,ma:'above20',maLabel:'站上20日线'},
    {code:'sh601012',name:'隆基绿能',price:'25.8',turnover:5.1,volRatio:2.45,capital:1.2,ma:'above20',maLabel:'突破20日线'},
    {code:'sz002371',name:'北方华创',price:'345',turnover:2.8,volRatio:1.92,capital:2.6,ma:'multi',maLabel:'多头排列'},
    {code:'sz000333',name:'美的集团',price:'68.3',turnover:1.6,volRatio:1.35,capital:0.9,ma:'above20',maLabel:'站上20日线'},
    {code:'sh603501',name:'韦尔股份',price:'98.5',turnover:3.5,volRatio:1.76,capital:1.5,ma:'golden',maLabel:'金叉'},
    {code:'sz300059',name:'东方财富',price:'18.5',turnover:6.5,volRatio:2.20,capital:0.6,ma:'golden',maLabel:'金叉'},
    {code:'sh601318',name:'中国平安',price:'52.3',turnover:1.2,volRatio:1.15,capital:0.3,ma:'above20',maLabel:'站上20日线'},
  ];
  const filtered = allStocks.filter(s =>
    s.turnover >= trMin && s.turnover <= trMax &&
    s.volRatio >= volRatioMin && s.capital >= capitalMin &&
    (!maFilter || s.ma === maFilter)
  );
  const el = document.getElementById('customResult');
  if (!filtered.length) { el.innerHTML = '<p style="color:#f0883e">未找到符合条件的股票，请放宽条件</p>'; return; }
  el.innerHTML = `<table class="data-table">
    <tr><th>代码</th><th>名称</th><th>价格</th><th>换手率</th><th>量比</th><th>主力净流入(亿)</th><th>均线状态</th></tr>
    ${filtered.map(s=>`<tr><td>${s.code}</td><td><b>${s.name}</b></td><td>${s.price}</td><td>${s.turnover}%</td><td>${s.volRatio}</td><td class="up">+${s.capital}</td><td class="up">${s.maLabel}</td></tr>`).join('')}
  </table>`;
}
