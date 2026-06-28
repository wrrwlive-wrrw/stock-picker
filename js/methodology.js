// 选股方法论模块
function renderMethodology(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-title">选股方法论</div>
      <div class="tabs">
        <div class="tab active" onclick="showMethodTab('fundamental')">基本面选股</div>
        <div class="tab" onclick="showMethodTab('technical')">技术面选股</div>
        <div class="tab" onclick="showMethodTab('trend')">趋势判断</div>
        <div class="tab" onclick="showMethodTab('sector')">板块轮动</div>
        <div class="tab" onclick="showMethodTab('compare')">价值vs趋势</div>
      </div>
      <div id="methodContent"></div>
    </div>
  `;
  showMethodTab('fundamental');
}

function showMethodTab(tab) {
  document.querySelectorAll('.tabs .tab').forEach((el,i) => {
    el.classList.toggle('active', el.textContent.includes(
      {fundamental:'基本面',technical:'技术面',trend:'趋势',sector:'板块',compare:'价值'}[tab]
    ));
  });
  const content = document.getElementById('methodContent');
  switch(tab) {
    case 'fundamental': content.innerHTML = getFundamentalContent(); break;
    case 'technical': content.innerHTML = getTechnicalContent(); break;
    case 'trend': content.innerHTML = getTrendContent(); break;
    case 'sector': content.innerHTML = getSectorContent(); break;
    case 'compare': content.innerHTML = getCompareContent(); break;
  }
}

function getFundamentalContent() {
  return `<div class="method-section">
    <h3>核心指标解读</h3>
    <div class="formula-box">PE（市盈率）= 股价 / 每股收益 → 越低越便宜（同行业比较）</div>
    <div class="formula-box">PB（市净率）= 股价 / 每股净资产 → PB<1可能被低估</div>
    <div class="formula-box">ROE（净资产收益率）= 净利润 / 净资产 → 越高盈利能力越强，>15%优秀</div>
    <div class="formula-box">营收增长率 → 持续>20%为高成长股</div>
    <div class="tip-box">
      <b>选股逻辑：</b>低PE + 高ROE + 营收持续增长 = 优质标的<br>
      注意：不同行业PE标准不同，银行PE=5-8正常，科技PE=30-50正常
    </div>
    <h3 style="margin-top:16px">基本面选股步骤</h3>
    <p>1. 确定行业：选择景气度向上的行业</p>
    <p>2. 财务筛选：ROE>15%、PE低于行业均值、营收增速>15%</p>
    <p>3. 护城河分析：品牌、专利、规模效应、网络效应</p>
    <p>4. 管理层评估：诚信、能力、激励机制是否与股东一致</p>
    <p>5. 估值判断：DCF折现、PEG（PE/增长率<1为低估）</p>
  </div>`;
}

function getTechnicalContent() {
  return `<div class="method-section">
    <h3>均线系统</h3>
    <div class="formula-box">MA5/MA10/MA20/MA60/MA120/MA250 分别代表周线、半月、月线、季线、半年线、年线</div>
    <div class="tip-box">
      <b>金叉：</b>短期均线上穿长期均线 → 买入信号<br>
      <b>死叉：</b>短期均线下穿长期均线 → 卖出信号<br>
      <b>多头排列：</b>MA5>MA10>MA20>MA60 → 强势上涨
    </div>
    <h3 style="margin-top:16px">MACD指标</h3>
    <div class="formula-box">DIF = EMA12 - EMA26，DEA = DIF的9日EMA，MACD柱 = 2×(DIF-DEA)</div>
    <p>• DIF上穿DEA（金叉）→ 买入 | DIF下穿DEA（死叉）→ 卖出</p>
    <p>• 零轴上方金叉更强势 | 底背离看涨 | 顶背离看跌</p>
    <h3 style="margin-top:16px">KDJ/RSI</h3>
    <div class="formula-box">KDJ：K<20超卖买入，K>80超买卖出 | RSI：<30超卖，>70超买</div>
    <p>• KDJ金叉（K上穿D）+ J值从负转正 → 强买入信号</p>
    <p>• RSI底背离 + 放量 → 反弹概率大</p>
    <h3 style="margin-top:16px">布林带(BOLL)</h3>
    <p>• 股价触及下轨且缩口 → 可能反弹</p>
    <p>• 股价突破上轨且开口扩大 → 强势延续</p>
    <p>• 布林带收窄后突破 → 变盘信号</p>
  </div>`;
}

function getTrendContent() {
  return `<div class="method-section">
    <h3>如何识别牛熊市</h3>
    <div class="tip-box">
      <b>牛市特征：</b>指数站上年线(MA250)、成交量持续放大、板块轮动活跃、新股密集上市<br>
      <b>熊市特征：</b>指数跌破年线、量能持续萎缩、个股普跌、破净股增多
    </div>
    <h3 style="margin-top:16px">顶底信号识别</h3>
    <p><b>顶部信号：</b></p>
    <p>• 量价背离（价格新高但成交量递减）</p>
    <p>• 大量利好出台但股价不涨（利好出尽是利空）</p>
    <p>• 散户跑步入场、全民炒股</p>
    <p>• 市场PE远超历史均值</p>
    <p style="margin-top:10px"><b>底部信号：</b></p>
    <p>• 地量（成交量极度萎缩）</p>
    <p>• 政策密集出台维稳（政策底）</p>
    <p>• 优质股跌出价值（PE低于历史10%分位）</p>
    <p>• 市场极度悲观，无人谈论股票</p>
    <h3 style="margin-top:16px">量价关系</h3>
    <div class="formula-box">量增价涨→健康上涨 | 量缩价涨→上涨乏力 | 放量下跌→加速出逃 | 缩量下跌→接近底部</div>
  </div>`;
}

function getSectorContent() {
  return `<div class="method-section">
    <h3>板块轮动规律</h3>
    <div class="tip-box">
      <b>经济周期四阶段：</b><br>
      衰退期 → 防御板块（医药、消费、公用事业）<br>
      复苏期 → 金融、地产、可选消费率先启动<br>
      扩张期 → 科技、制造、周期品表现最佳<br>
      过热期 → 资源股（煤炭、有色、石油）最后冲高
    </div>
    <h3 style="margin-top:16px">A股常见轮动路径</h3>
    <p>• 券商先行 → 蓝筹搭台 → 题材唱戏 → 垃圾股补涨 → 见顶</p>
    <p>• 政策主题（新能源/AI）→ 龙头确认 → 跟风扩散 → 高位分化</p>
    <h3 style="margin-top:16px">如何选择板块</h3>
    <p>1. 关注政策方向（产业政策、财政投向）</p>
    <p>2. 跟踪资金流向（北向资金、主力净流入板块）</p>
    <p>3. 业绩兑现逻辑（高景气 + 业绩超预期）</p>
    <p>4. 技术形态确认（板块指数突破关键均线）</p>
  </div>`;
}

function getCompareContent() {
  return `<div class="method-section">
    <h3>价值投资 vs 趋势投资</h3>
    <table class="data-table">
      <tr><th>维度</th><th>价值投资</th><th>趋势投资</th></tr>
      <tr><td>核心理念</td><td>买入被低估的优质资产</td><td>顺势而为，强者恒强</td></tr>
      <tr><td>持股周期</td><td>中长期（半年-数年）</td><td>短中期（数天-数月）</td></tr>
      <tr><td>选股依据</td><td>PE/PB/ROE/现金流</td><td>均线/MACD/量价/形态</td></tr>
      <tr><td>买入时机</td><td>市场恐慌时低估买入</td><td>突破关键位置时追入</td></tr>
      <tr><td>卖出时机</td><td>严重高估或基本面恶化</td><td>跌破支撑或趋势反转</td></tr>
      <tr><td>代表人物</td><td>巴菲特、格雷厄姆</td><td>利弗莫尔、威廉·欧奈尔</td></tr>
      <tr><td>适合人群</td><td>耐心强、研究能力强</td><td>执行力强、纪律性好</td></tr>
      <tr><td>风险</td><td>价值陷阱（越跌越买）</td><td>频繁止损、过度交易</td></tr>
    </table>
    <div class="tip-box" style="margin-top:16px">
      <b>建议：</b>对大多数散户而言，"价值投资选股 + 技术分析择时"的组合策略最实用。
      用基本面选出好公司，用技术面选择好的买卖点。
    </div>
  </div>`;
}
