// 投资建议模块 - 直接给出股票代码和操作建议
function renderRecommend(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-title">今日投资建议</div>
      <div class="tip-box" style="border-left-color:#f0883e">
        <b>免责声明：</b>以下建议基于技术面+基本面综合分析，仅供参考，不构成投资依据。
        股市有风险，入市需谨慎。请根据自身风险承受能力做出决策。
      </div>
    </div>
    ${renderStrongBuy()}
    ${renderSectorPicks()}
    ${renderUSStockPicks()}
    ${renderAvoidList()}
    ${renderOperationTips()}
  `;
}

function renderStrongBuy() {
  const picks = [
    {code:'sh600519',name:'贵州茅台',price:'1756',target:'1900-2000',
     reason:'白酒龙头，ROE>30%，业绩稳定增长，外资持续加仓',
     rating:'强烈推荐',strategy:'回调至1700附近分批建仓，止损1650'},
    {code:'sz300750',name:'宁德时代',price:'218',target:'250-280',
     reason:'动力电池全球龙头，产能扩张+海外订单爆发',
     rating:'强烈推荐',strategy:'站稳220可买入，止损200'},
    {code:'sz002594',name:'比亚迪',price:'285',target:'320-350',
     reason:'新能源车销量持续创新高，智能驾驶+出海双轮驱动',
     rating:'推荐买入',strategy:'回踩5日线加仓，止损260'},
    {code:'sh601012',name:'隆基绿能',price:'25.8',target:'30-35',
     reason:'光伏龙头超跌反弹，PE历史低位，BC电池技术领先',
     rating:'推荐买入',strategy:'底部放量突破，目标30，止损23'},
    {code:'sh688981',name:'中芯国际',price:'78.9',target:'90-100',
     reason:'半导体国产替代核心标的，先进制程持续突破',
     rating:'推荐买入',strategy:'站上年线确认趋势，逢低布局'},
  ];
  return `<div class="card">
    <div class="card-title" style="color:#16c784">A股重点推荐</div>
    <table class="data-table">
      <tr><th>代码</th><th>名称</th><th>现价</th><th>目标价</th><th>评级</th><th>理由</th><th>操作策略</th><th>自选</th></tr>
      ${picks.map(p=>`<tr>
        <td>${p.code}</td><td><b>${p.name}</b></td><td>${p.price}</td>
        <td class="up">${p.target}</td><td class="up">${p.rating}</td>
        <td style="font-size:11px">${p.reason}</td>
        <td style="font-size:11px">${p.strategy}</td>
        <td><button class="btn btn-blue btn-sm" onclick="addToWatchlist('${p.code}','${p.name}','${p.price}','${p.rating}')">+自选</button></td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function renderSectorPicks() {
  const sectors = [
    {name:'AI算力',logic:'大模型军备竞赛持续，算力需求爆发',
     stocks:'中际旭创(sz300308)、工业富联(sh601138)、浪潮信息(sz000977)',
     timing:'回调至20日线附近买入'},
    {name:'半导体国产替代',logic:'美国芯片禁令加码，国产替代紧迫性提升',
     stocks:'中芯国际(sh688981)、北方华创(sz002371)、韦尔股份(sh603501)',
     timing:'板块轮动到科技线时重点关注'},
    {name:'新能源汽车',logic:'渗透率持续提升，智能驾驶进入商用阶段',
     stocks:'比亚迪(sz002594)、宁德时代(sz300750)、华为产业链',
     timing:'月销量数据公布后的预期差机会'},
    {name:'军工',logic:'地缘冲突升级+军费增长确定性强',
     stocks:'中航沈飞(sh600760)、航发动力(sh600893)、中航光电(sz002179)',
     timing:'中东/台海消息面催化时介入'},
  ];
  return `<div class="card">
    <div class="card-title" style="color:#58a6ff">板块配置建议</div>
    ${sectors.map(s=>`<div class="factor-card" style="margin-bottom:10px">
      <h4>${s.name}</h4>
      <p><b>逻辑：</b>${s.logic}</p>
      <p><b>标的：</b><span class="up">${s.stocks}</span></p>
      <p><b>时机：</b>${s.timing}</p>
    </div>`).join('')}
  </div>`;
}

function renderUSStockPicks() {
  const picks = [
    {code:'NVDA',name:'英伟达',price:'130',target:'150-160',
     reason:'AI芯片绝对龙头，数据中心收入持续翻倍增长',strategy:'回调至120支撑位买入'},
    {code:'AAPL',name:'苹果',price:'195',target:'210-220',
     reason:'AI手机周期+服务收入高增长+回购支撑',strategy:'站稳190可持有'},
    {code:'TSLA',name:'特斯拉',price:'250',target:'280-300',
     reason:'FSD进展+Robotaxi预期+储能业务爆发',strategy:'波动大，建议分批，止损220'},
    {code:'MSFT',name:'微软',price:'430',target:'460-480',
     reason:'Azure云+Copilot AI商业化领先，现金流充沛',strategy:'稳健持有，回调5%加仓'},
    {code:'AMZN',name:'亚马逊',price:'185',target:'200-210',
     reason:'AWS增速回升+零售利润率改善+广告高增',strategy:'突破前高后回踩买入'},
  ];
  return `<div class="card">
    <div class="card-title" style="color:#f0883e">美股推荐</div>
    <table class="data-table">
      <tr><th>代码</th><th>名称</th><th>现价$</th><th>目标价$</th><th>理由</th><th>操作</th><th>自选</th></tr>
      ${picks.map(p=>`<tr>
        <td><b>${p.code}</b></td><td>${p.name}</td><td>${p.price}</td>
        <td class="up">${p.target}</td>
        <td style="font-size:11px">${p.reason}</td>
        <td style="font-size:11px">${p.strategy}</td>
        <td><button class="btn btn-blue btn-sm" onclick="addToWatchlist('${p.code}','${p.name}','${p.price}','美股推荐')">+自选</button></td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function renderAvoidList() {
  const avoids = [
    {type:'高位股',desc:'连续涨停后放量滞涨，主力可能出货',examples:'近期暴涨3倍以上题材股'},
    {type:'ST/*ST',desc:'存在退市风险，基本面严重恶化',examples:'*ST类个股全部回避'},
    {type:'商誉爆雷',desc:'大额商誉减值风险',examples:'商誉占净资产>50%的公司'},
    {type:'大股东减持',desc:'大股东/高管密集减持，信号负面',examples:'公告减持计划的个股'},
  ];
  return `<div class="card">
    <div class="card-title" style="color:#ea3943">风险回避清单</div>
    <table class="data-table">
      <tr><th>类型</th><th>风险说明</th><th>具体情况</th></tr>
      ${avoids.map(a=>`<tr>
        <td class="down"><b>${a.type}</b></td>
        <td style="font-size:12px">${a.desc}</td>
        <td style="font-size:12px">${a.examples}</td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function renderOperationTips() {
  return `<div class="card">
    <div class="card-title">实战操作建议</div>
    <div class="factor-grid">
      <div class="factor-card">
        <h4>仓位管理</h4>
        <p>• 总仓位不超80%，留20%现金<br>
        • 单只不超总资金20%<br>
        • 分3次建仓：试探30%→确认40%→加仓30%<br>
        • 亏损8%坚决止损</p>
      </div>
      <div class="factor-card">
        <h4>买入时机</h4>
        <p>• 大盘企稳+板块启动+个股突破<br>
        • 缩量回踩均线是加仓良机<br>
        • 早盘观察，下午确认再操作<br>
        • 不追高！回调买入成功率高3倍</p>
      </div>
      <div class="factor-card">
        <h4>卖出时机</h4>
        <p>• 目标价分批止盈（先出50%）<br>
        • 跌破20日线且放量→减仓<br>
        • 利好出尽不涨→果断离场<br>
        • MACD顶背离+长上影线→风险</p>
      </div>
      <div class="factor-card">
        <h4>当前市场判断</h4>
        <p>• 大盘震荡市，结构性行情为主<br>
        • 重点：AI算力、半导体、新能源车<br>
        • 回避：高位题材、地产链<br>
        • 建议仓位：60-70%</p>
      </div>
    </div>
  </div>`;
}
