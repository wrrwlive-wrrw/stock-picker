// 宏观因素分析模块
function renderMacro(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-title">宏观因素分析</div>
      <div class="tabs">
        <div class="tab active" onclick="showMacroTab('domestic')">国内经济</div>
        <div class="tab" onclick="showMacroTab('international')">国际因素</div>
        <div class="tab" onclick="showMacroTab('policy')">政策面</div>
        <div class="tab" onclick="showMacroTab('linkage')">联动关系</div>
      </div>
      <div id="macroContent"></div>
    </div>
  `;
  showMacroTab('domestic');
}

function showMacroTab(tab) {
  document.querySelectorAll('.card .tabs .tab').forEach(el => {
    const map = {domestic:'国内',international:'国际',policy:'政策',linkage:'联动'};
    el.classList.toggle('active', el.textContent.includes(map[tab]));
  });
  const content = document.getElementById('macroContent');
  switch(tab) {
    case 'domestic': content.innerHTML = getDomesticContent(); break;
    case 'international': content.innerHTML = getInternationalContent(); break;
    case 'policy': content.innerHTML = getPolicyContent(); break;
    case 'linkage': content.innerHTML = getLinkageContent(); break;
  }
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

function getInternationalContent() {
  return `<div class="factor-grid">
    <div class="factor-card">
      <h4>美联储政策</h4>
      <p><b>加息：</b>美元走强，资金回流美国，新兴市场承压<br>
      <b>降息：</b>全球流动性宽松，利好风险资产<br>
      <b>缩表/扩表：</b>影响全球流动性总量</p>
      <div style="margin-top:8px">
        <span class="factor-tag tag-positive">降息→利好A股</span>
        <span class="factor-tag tag-negative">加息→资金外流</span>
      </div>
    </div>
    <div class="factor-card">
      <h4>美元指数(DXY)</h4>
      <p>美元走强→大宗商品承压→有色/石油股利空<br>
      美元走弱→人民币升值→外资流入A股<br>
      关注：美元指数100为关键心理关口</p>
    </div>
    <div class="factor-card">
      <h4>地缘政治冲突</h4>
      <p><b>俄乌冲突：</b>影响能源价格、粮食价格、欧洲经济<br>
      <b>美伊紧张：</b>推升原油价格，航运/军工受益<br>
      <b>中美关系：</b>科技封锁→国产替代加速<br>
      <b>台海局势：</b>影响半导体产业链、避险情绪</p>
      <div style="margin-top:8px">
        <span class="factor-tag tag-positive">军工/能源受益</span>
        <span class="factor-tag tag-negative">全球风险偏好下降</span>
      </div>
    </div>
    <div class="factor-card">
      <h4>国际油价/金价</h4>
      <p><b>油价上涨：</b>利好石油股、煤化工，利空航空/化工<br>
      <b>金价上涨：</b>避险情绪升温，利好黄金股<br>
      <b>铜价：</b>"铜博士"是经济先行指标</p>
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
    </table>
    <div class="tip-box" style="margin-top:16px">
      <b>实战建议：</b>每天关注财经新闻头条，判断当前主导因素，据此调整持仓方向。
      宏观因素改变行业景气度，景气度决定企业盈利，盈利驱动股价。
    </div>
  </div>`;
}
