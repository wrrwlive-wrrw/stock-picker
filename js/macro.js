// 宏观因素分析模块
function renderMacro(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-title">宏观因素分析</div>
      <div class="tabs">
        <div class="tab active" onclick="showMacroTab('domestic')">国内经济</div>
        <div class="tab" onclick="showMacroTab('global')">全球股市</div>
        <div class="tab" onclick="showMacroTab('us')">美国市场</div>
        <div class="tab" onclick="showMacroTab('policy')">政策面</div>
        <div class="tab" onclick="showMacroTab('policyImpact')">政策影响</div>
        <div class="tab" onclick="showMacroTab('linkage')">联动关系</div>
      </div>
      <div id="macroContent"></div>
    </div>
  `;
  showMacroTab('domestic');
}

function showMacroTab(tab) {
  document.querySelectorAll('.card .tabs .tab').forEach(el => {
    const map = {domestic:'国内经济',global:'全球股市',us:'美国市场',policy:'政策面',policyImpact:'政策影响',linkage:'联动关系'};
    el.classList.toggle('active', el.textContent === map[tab]);
  });
  const content = document.getElementById('macroContent');
  const r = {domestic:getDomesticContent,global:getGlobalMarketsContent,us:getUSMarketContent,policy:getPolicyContent,policyImpact:getPolicyImpactContent,linkage:getLinkageContent};
  if (r[tab]) content.innerHTML = r[tab]();
}

function getDomesticContent() {
  return `<div class="factor-grid">
    <div class="factor-card">
      <h4>央行货币政策</h4>
      <p><b>降准：</b>释放流动性，利好银行、地产、股市整体<br>
      <b>降息（LPR下调）：</b>降低融资成本，利好高负债行业<br>
      <b>MLF/逆回购：</b>短期流动性信号</p>
      <div style="margin-top:8px">
        <span class="factor-tag tag-positive">降准降息→利好</span>
        <span class="factor-tag tag-negative">加息缩表→利空</span>
      </div>
    </div>
    <div class="factor-card">
      <h4>GDP增速</h4>
      <p>反映经济整体状况，GDP超预期→企业盈利改善→股市上涨<br>
      关注：季度同比增速、环比趋势</p>
      <div style="margin-top:8px">
        <span class="factor-tag tag-positive">GDP超预期→利好</span>
        <span class="factor-tag tag-negative">GDP不及预期→利空</span>
      </div>
    </div>
    <div class="factor-card">
      <h4>CPI/PPI</h4>
      <p><b>CPI：</b>消费物价，CPI过高→可能收紧货币<br>
      <b>PPI：</b>工业品价格，PPI上行→周期股（煤炭有色）受益<br>
      <b>剪刀差(PPI-CPI)：</b>反映企业利润空间</p>
    </div>
    <div class="factor-card">
      <h4>PMI/社融</h4>
      <p><b>PMI>50：</b>制造业扩张，经济向好<br>
      <b>社融超预期：</b>信用扩张，实体经济活跃<br>
      <b>M1-M2剪刀差：</b>收窄→资金活化→股市有望</p>
    </div>
  </div>`;
}

function getGlobalMarketsContent() {
  return `<div class="factor-grid">
    <div class="factor-card" style="border-top:3px solid #ea3943">
      <h4>🇯🇵 日本股市（日经225/东证指数）</h4>
      <p><b>当前特点：</b>日本央行结束负利率，日元走势成关键变量</p>
      <p><b>对A股传导：</b></p>
      <ul style="font-size:12px;margin-top:4px">
        <li>日元贬值→日本出口竞争力增强→中国出口企业承压（家电/汽车）</li>
        <li>日本半导体设备限制出口→A股半导体国产替代加速</li>
        <li>日股创新高→全球资金风险偏好提升→间接利好A股</li>
        <li>巴菲特增持日本商社→市场关注低PB高分红策略</li>
      </ul>
      <div style="margin-top:8px">
        <span class="factor-tag tag-positive">日股涨→亚太信心提升</span>
        <span class="factor-tag tag-negative">日元急升→套息交易逆转</span>
      </div>
    </div>
    <div class="factor-card" style="border-top:3px solid #58a6ff">
      <h4>🇰🇷 韩国股市（KOSPI/KOSDAQ）</h4>
      <p><b>当前特点：</b>半导体周期复苏，三星/SK海力士为风向标</p>
      <p><b>对A股传导：</b></p>
      <ul style="font-size:12px;margin-top:4px">
        <li>韩国存储芯片涨价→A股存储产业链（兆易创新/长江存储概念）受益</li>
        <li>KOSDAQ科技股领涨→A股创业板/科创板情绪共振</li>
        <li>韩国造船/电池订单→对比中国同行竞争格局</li>
        <li>韩国"企业价值提升计划"→A股"中特估"逻辑对标</li>
      </ul>
      <div style="margin-top:8px">
        <span class="factor-tag tag-positive">半导体涨价→存储链利好</span>
        <span class="factor-tag tag-negative">韩元贬值→资金流出亚洲</span>
      </div>
    </div>
    <div class="factor-card" style="border-top:3px solid #f0883e">
      <h4>🇭🇰 香港股市（恒生指数/恒生科技）</h4>
      <p><b>当前特点：</b>中国资产定价锚，南向资金持续流入</p>
      <p><b>对A股传导：</b></p>
      <ul style="font-size:12px;margin-top:4px">
        <li>港股是A股的"先行指标"——外资先买港股再布局A股</li>
        <li>恒生科技涨→A股互联网/科技股情绪提振</li>
        <li>AH溢价指数：>140时港股有估值修复需求</li>
        <li>南向资金大幅流入→A股投资者对港股偏好上升</li>
        <li>港股通标的（如腾讯/美团）走势影响A股相关概念</li>
      </ul>
      <div style="margin-top:8px">
        <span class="factor-tag tag-positive">港股反弹→外资回流A股</span>
        <span class="factor-tag tag-negative">港股破位→中国资产信心动摇</span>
      </div>
    </div>
    <div class="factor-card" style="border-top:3px solid #16c784">
      <h4>🌏 亚太联动规律</h4>
      <p><b>核心逻辑：</b>全球资金在美/日/韩/港/A之间轮动</p>
      <table class="data-table" style="font-size:11px;margin-top:6px">
        <tr><th>信号</th><th>含义</th><th>A股影响</th></tr>
        <tr><td>日韩港齐涨</td><td>亚太风险偏好上升</td><td class="up">利好，跟涨概率高</td></tr>
        <tr><td>日涨韩跌</td><td>日元贬值驱动</td><td>中性，关注汇率</td></tr>
        <tr><td>港股暴跌A股抗跌</td><td>南向资金托底</td><td>短期安全但需警惕</td></tr>
        <tr><td>全球齐跌</td><td>系统性风险</td><td class="down">A股难独善其身</td></tr>
      </table>
    </div>
  </div>`;
}

function getUSMarketContent() {
  return `<div class="factor-grid">
    <div class="factor-card" style="border-top:3px solid #58a6ff">
      <h4>🇺🇸 美联储货币政策</h4>
      <p><b>加息周期：</b>美元走强，全球资金回流，新兴市场承压，A股外资流出</p>
      <p><b>降息周期：</b>全球流动性宽松，风险资产受益，北向资金加速流入A股</p>
      <p><b>缩表/扩表：</b>影响全球流动性总量和风险定价</p>
      <div style="margin-top:8px">
        <span class="factor-tag tag-positive">降息→利好A股成长</span>
        <span class="factor-tag tag-negative">加息→资金外流压力</span>
      </div>
    </div>
    <div class="factor-card" style="border-top:3px solid #16c784">
      <h4>🇺🇸 三大指数对A股映射</h4>
      <table class="data-table" style="font-size:11px;margin-top:6px">
        <tr><th>美股指数</th><th>A股映射板块</th><th>传导逻辑</th></tr>
        <tr><td>纳斯达克↑</td><td class="up">科创板/创业板/AI算力</td><td>科技情绪共振</td></tr>
        <tr><td>费城半导体↑</td><td class="up">A股半导体全产业链</td><td>行业景气传导</td></tr>
        <tr><td>道琼斯↓</td><td class="down">白马蓝筹/消费</td><td>价值股避险</td></tr>
        <tr><td>标普500↑</td><td class="up">沪深300/大盘蓝筹</td><td>全球配置资金流入</td></tr>
        <tr><td>中概股ETF↑</td><td class="up">恒生科技→A股互联网</td><td>中国资产重估</td></tr>
      </table>
    </div>
    <div class="factor-card" style="border-top:3px solid #f0883e">
      <h4>🇺🇸 美元指数与大宗商品</h4>
      <p><b>美元指数(DXY)：</b></p>
      <ul style="font-size:12px;margin-top:4px">
        <li>DXY>105：强美元，人民币承压，外资流出，A股承压</li>
        <li>DXY<100：弱美元，人民币升值，北向资金回流</li>
        <li>DXY急跌：大宗商品涨→有色/石油A股受益</li>
      </ul>
      <p style="margin-top:6px"><b>美债收益率：</b></p>
      <ul style="font-size:12px;margin-top:4px">
        <li>10Y美债>4.5%：高利率压制全球估值，成长股杀估值</li>
        <li>10Y美债下行：利好科技/成长股估值修复</li>
        <li>美债收益率倒挂：衰退预警，防御板块（医药/公用）受益</li>
      </ul>
    </div>
    <div class="factor-card" style="border-top:3px solid #ea3943">
      <h4>🇺🇸 中美博弈对行业影响</h4>
      <table class="data-table" style="font-size:11px;margin-top:6px">
        <tr><th>博弈领域</th><th>受益板块</th><th>承压板块</th></tr>
        <tr><td>芯片禁令</td><td class="up">半导体国产替代</td><td class="down">依赖进口设备企业</td></tr>
        <tr><td>关税战</td><td class="up">内需消费/国产品牌</td><td class="down">出口依赖型企业</td></tr>
        <tr><td>科技封锁</td><td class="up">信创/国产软件/AI</td><td class="down">中概互联网</td></tr>
        <tr><td>金融脱钩</td><td class="up">A股本土券商</td><td class="down">外资占比高标的</td></tr>
      </table>
    </div>
  </div>`;
}

function getPolicyContent() {
  return `<div class="factor-grid">
    <div class="factor-card">
      <h4>产业政策</h4>
      <p>• 新能源：碳中和目标，光伏/风电/储能持续受益<br>
      • 半导体：大基金投资，国产替代是长期主线<br>
      • AI人工智能：算力建设、大模型应用<br>
      • 数字经济：数据要素、信创、智慧城市</p>
    </div>
    <div class="factor-card">
      <h4>监管政策</h4>
      <p>• IPO节奏：收紧IPO→存量博弈利好小盘<br>
      • 印花税调整：降低→短期重大利好<br>
      • 退市新规：加速出清垃圾股<br>
      • 量化监管：限制量化→减少市场波动</p>
    </div>
    <div class="factor-card">
      <h4>财政政策</h4>
      <p>• 专项债加速发行→基建板块受益<br>
      • 减税降费→中小企业利润改善<br>
      • 消费券/补贴→消费板块短期提振<br>
      • 房地产政策放松→地产链回暖</p>
    </div>
    <div class="factor-card">
      <h4>外贸政策</h4>
      <p>• 关税变动：中美贸易摩擦影响出口企业<br>
      • 人民币汇率：贬值利好出口，升值利好进口<br>
      • RCEP/一带一路：拓展海外市场机遇</p>
    </div>
  </div>`;
}

// 新增：政策对股市/股价影响分析与预测
function getPolicyImpactContent() {
  return `<div class="method-section">
    <h3 style="color:#58a6ff">中国宏观政策出台对股市的影响分析框架</h3>
    <div class="tip-box" style="margin-bottom:16px">
      <b>核心逻辑：</b>政策→预期→资金→板块→个股。政策出台后市场反应分三阶段：
      ①政策预期期（消息面博弈）②政策落地期（买预期卖事实）③政策效果验证期（业绩兑现）
    </div>
  </div>
  <div class="factor-grid">
    <div class="factor-card" style="border-left:4px solid #ea3943">
      <h4>🏦 货币政策影响路径</h4>
      <table class="data-table" style="font-size:11px;margin-top:6px">
        <tr><th>政策动作</th><th>直接影响</th><th>受益板块</th><th>股价反应</th></tr>
        <tr><td>降准0.25%</td><td>释放~5000亿流动性</td><td class="up">银行/地产/券商</td><td>短期涨1-3%</td></tr>
        <tr><td>LPR下调10bp</td><td>贷款成本降低</td><td class="up">地产/高负债企业</td><td>地产链涨2-5%</td></tr>
        <tr><td>MLF超额续作</td><td>短期流动性充裕</td><td class="up">小盘成长股</td><td>创业板偏强</td></tr>
        <tr><td>汇率干预(稳汇率)</td><td>人民币止跌</td><td class="up">航空/造纸(进口)</td><td>相关个股反弹</td></tr>
      </table>
      <p style="font-size:11px;color:#8b949e;margin-top:8px">
        <b>预测规律：</b>降准后5个交易日内银行股平均涨2.1%，券商涨3.5%（统计近10次）。
        但"买预期卖事实"——若市场已提前反应，落地后反而回调。
      </p>
    </div>
    <div class="factor-card" style="border-left:4px solid #f0883e">
      <h4>🏗️ 财政/产业政策影响路径</h4>
      <table class="data-table" style="font-size:11px;margin-top:6px">
        <tr><th>政策类型</th><th>传导时间</th><th>受益标的</th><th>影响幅度</th></tr>
        <tr><td>专项债加速</td><td>1-2月</td><td class="up">中国建筑/中国中铁</td><td>短期5-10%</td></tr>
        <tr><td>新能源补贴</td><td>即时</td><td class="up">比亚迪/宁德时代</td><td>消息日涨3-5%</td></tr>
        <tr><td>半导体大基金注资</td><td>1-3月</td><td class="up">中芯/北方华创</td><td>中期15-30%</td></tr>
        <tr><td>房地产放松(限购取消)</td><td>即时~1月</td><td class="up">万科/保利/贝壳</td><td>短期涨5-15%</td></tr>
        <tr><td>消费券/以旧换新</td><td>即时</td><td class="up">家电/汽车</td><td>短期涨3-8%</td></tr>
        <tr><td>AI/数字经济规划</td><td>持续</td><td class="up">算力/大模型/信创</td><td>长期趋势性</td></tr>
      </table>
    </div>
    <div class="factor-card" style="border-left:4px solid #16c784">
      <h4>📊 监管政策对市场情绪影响</h4>
      <table class="data-table" style="font-size:11px;margin-top:6px">
        <tr><th>监管动作</th><th>市场反应</th><th>持续时间</th><th>操作建议</th></tr>
        <tr><td>印花税下调</td><td class="up">大盘暴涨3-5%</td><td>1-3天</td><td>短线追涨，中线无效</td></tr>
        <tr><td>暂停IPO</td><td class="up">小盘股活跃</td><td>持续</td><td>布局次新股/小市值</td></tr>
        <tr><td>限制减持</td><td class="up">市场信心提振</td><td>1-2周</td><td>大股东持仓高标的受益</td></tr>
        <tr><td>严查量化</td><td>指数波动↓</td><td>短期</td><td>趋势策略降仓</td></tr>
        <tr><td>退市加速</td><td class="down">ST板块杀跌</td><td>持续</td><td>坚决回避垃圾股</td></tr>
        <tr><td>融券做空收紧</td><td class="up">空头回补涨</td><td>1-3天</td><td>被做空标的反弹</td></tr>
      </table>
    </div>
    <div class="factor-card" style="border-left:4px solid #d29922">
      <h4>🔮 政策预测与操作框架</h4>
      <p style="font-size:12px"><b>如何提前布局政策行情：</b></p>
      <ul style="font-size:12px;margin-top:4px">
        <li><b>经济工作会议前(12月)：</b>布局次年政策主线</li>
        <li><b>两会前(2-3月)：</b>政策预期升温，相关板块先涨</li>
        <li><b>国常会/政治局会议：</b>关注"适时""加大力度"等措辞变化</li>
        <li><b>央行季度货币政策报告：</b>判断下阶段宽松/收紧方向</li>
      </ul>
      <p style="font-size:12px;margin-top:8px"><b>政策信号强弱判断：</b></p>
      <ul style="font-size:12px;margin-top:4px">
        <li>🟢 强信号：国务院/政治局级别+具体数字+时间表 → 立即行动</li>
        <li>🟡 中信号：部委级别+方向性表述 → 关注跟踪</li>
        <li>🔴 弱信号：地方/媒体吹风 → 观望为主</li>
      </ul>
    </div>
  </div>
  ${getPolicyStockImpactTable()}`;
}

// 政策对具体个股的影响预测表
function getPolicyStockImpactTable() {
  const items = [
    {policy:'降准/降息',stocks:'招商银行、宁波银行、中信证券',dir:'up',impact:'流动性宽松提升估值，银行息差短期受压但量补价',timing:'政策落地后1-3天'},
    {policy:'房地产放松',stocks:'万科A、保利发展、贝壳',dir:'up',impact:'销售数据改善预期→地产链估值修复',timing:'政策公布即时反应'},
    {policy:'新能源补贴延续',stocks:'比亚迪、宁德时代、阳光电源',dir:'up',impact:'降低终端成本→销量提升→业绩确定性增强',timing:'公布后1周内'},
    {policy:'半导体大基金三期',stocks:'中芯国际、北方华创、中微公司',dir:'up',impact:'资金+政策双驱动，估值中枢上移',timing:'中期持续（3-6个月）'},
    {policy:'AI算力规划出台',stocks:'中际旭创、浪潮信息、寒武纪',dir:'up',impact:'产业资本开支加速→订单增长预期',timing:'主题期1-2月'},
    {policy:'医药集采扩围',stocks:'恒瑞医药、药明康德、迈瑞医疗',dir:'down',impact:'中标品种降价压缩利润，创新药逻辑分化',timing:'中标结果公布日'},
    {policy:'环保限产加严',stocks:'海螺水泥、宝钢股份、中国神华',dir:'up',impact:'供给收缩→产品涨价→龙头利润增厚',timing:'政策执行期（供暖季前）'},
    {policy:'消费以旧换新',stocks:'美的集团、格力电器、长安汽车',dir:'up',impact:'刺激换购需求→短期销量脉冲',timing:'补贴发放后1-2月'},
  ];
  return `<div class="card" style="margin-top:16px">
    <div class="card-title">📋 政策→个股影响预测（常见场景）</div>
    <div style="overflow-x:auto"><table class="data-table" style="font-size:12px">
      <tr><th>政策场景</th><th>核心受益/受损标的</th><th>方向</th><th>影响逻辑</th><th>反应时间</th></tr>
      ${items.map(i=>`<tr>
        <td><b>${i.policy}</b></td>
        <td>${i.stocks}</td>
        <td class="${i.dir}">${i.dir==='up'?'📈 利好':'📉 利空'}</td>
        <td style="font-size:11px">${i.impact}</td>
        <td style="font-size:11px">${i.timing}</td>
      </tr>`).join('')}
    </table></div>
    <div class="tip-box" style="margin-top:12px">
      <b>实战提示：</b>政策利好后第一天追涨风险大（情绪溢价），建议等回调2-3天后布局。
      政策利空要区分"一次性利空"和"持续性利空"：集采是持续的，单次罚款是一次性的。
    </div>
  </div>`;
}

function getLinkageContent() {
  return `<div class="method-section">
    <h3>宏观因素与板块联动关系图</h3>
    <table class="data-table">
      <tr><th>宏观因素</th><th>利好板块</th><th>利空板块</th></tr>
      <tr><td>降准降息</td><td class="up">银行、地产、券商</td><td class="down">—</td></tr>
      <tr><td>美联储加息</td><td class="up">银行（息差扩大）</td><td class="down">成长股、黄金</td></tr>
      <tr><td>油价上涨</td><td class="up">石油、煤化工</td><td class="down">航空、化工下游</td></tr>
      <tr><td>人民币贬值</td><td class="up">纺织出口、家电出口</td><td class="down">航空（美元债）</td></tr>
      <tr><td>地缘冲突升级</td><td class="up">军工、黄金、能源</td><td class="down">消费、科技</td></tr>
      <tr><td>CPI上行</td><td class="up">农业、食品、零售</td><td class="down">—</td></tr>
      <tr><td>基建政策加码</td><td class="up">建材、钢铁、机械</td><td class="down">—</td></tr>
      <tr><td>科技政策利好</td><td class="up">半导体、信创、AI</td><td class="down">—</td></tr>
      <tr><td>房地产放松</td><td class="up">地产、建材、家居</td><td class="down">—</td></tr>
      <tr><td>消费刺激政策</td><td class="up">白酒、汽车、家电</td><td class="down">—</td></tr>
      <tr><td>美股大跌(纳指-3%)</td><td class="up">避险黄金、防御性消费</td><td class="down">A股科技、中概映射股</td></tr>
      <tr><td>美股大涨(纳指+2%)</td><td class="up">A股AI/半导体、港股科技</td><td class="down">—</td></tr>
      <tr><td>日经上涨(日银宽松)</td><td class="up">港股/A50相关标的、汽车零部件</td><td class="down">日系家电竞争压力</td></tr>
      <tr><td>韩国半导体涨</td><td class="up">A股存储/半导体设备</td><td class="down">—</td></tr>
      <tr><td>港股恒指反弹</td><td class="up">A股金融地产、南向标的</td><td class="down">—</td></tr>
      <tr><td>美元指数破105</td><td class="up">A股出口链</td><td class="down">有色/黄金/大宗</td></tr>
      <tr><td>美债10Y破4.5%</td><td class="up">银行</td><td class="down">成长股/高PE股</td></tr>
      <tr><td>台海紧张升级</td><td class="up">军工、A股半导体国产替代</td><td class="down">台积电产业链</td></tr>
    </table>
    <div class="tip-box" style="margin-top:16px">
      <b>实战建议：</b>每天开盘前查看：①隔夜美股/纳指 ②日韩早盘表现 ③港股恒指/恒生科技开盘方向。
      三者共振向上→A股高开概率大，可择机进场。三者共振向下→防御为主，控制仓位。
    </div>
  </div>`;
}
