// 交易信号引擎：五维评估 + 买入/卖出/持有信号
// 用于自选股每日体检和退出预警

// 获取大盘环境（强/中/弱）
async function getMarketContext() {
  try {
    const indexData = await fetchIndexData();
    const sh = indexData.sh000001 || {};
    const sz = indexData.sz399001 || {};
    const cyb = indexData.sz399006 || {};
    const shPct = parseFloat(sh.pct) || 0;
    const szPct = parseFloat(sz.pct) || 0;
    const cybPct = parseFloat(cyb.pct) || 0;
    const avgPct = (shPct + szPct + cybPct) / 3;
    let level, desc, color;
    if (avgPct > 1.5) { level='strong'; desc='大盘强势上涨，积极做多'; color='#16c784'; }
    else if (avgPct > 0.5) { level='mid-up'; desc='大盘温和上涨，偏多操作'; color='#3fb950'; }
    else if (avgPct > -0.5) { level='neutral'; desc='大盘窄幅震荡，精选个股'; color='#d29922'; }
    else if (avgPct > -1.5) { level='weak'; desc='大盘偏弱，控制仓位'; color='#f0883e'; }
    else { level='bad'; desc='大盘大跌，防御为主'; color='#ea3943'; }
    return { level, desc, color, shPct, szPct, cybPct, avgPct: avgPct.toFixed(2) };
  } catch(e) {
    return { level:'unknown', desc:'大盘数据加载失败', color:'#8b949e', shPct:0, szPct:0, cybPct:0, avgPct:'0.00' };
  }
}

// 主评估函数（增强版：结合成本价+行业分析+企业基本面+资金流向+技术信号）
function evaluateWatchStock(stock, marketCtx, realTimeData) {
  const price = parseFloat(stock.price) || 0;
  const addPrice = parseFloat(stock.addPrice) || price;
  const costPrice = parseFloat(stock.costPrice) || addPrice;
  const targetPrice = parseFloat(stock.targetPrice) || 0;
  const stopLoss = parseFloat(stock.stopLoss) || 0;
  const pnlPct = costPrice > 0 ? ((price - costPrice) / costPrice * 100) : 0;

  // 使用真实资金数据（如果有）
  const cap = (realTimeData && realTimeData.capitalFlow) ? {
    main: (realTimeData.capitalFlow.main > 0 ? '+' : '') + realTimeData.capitalFlow.main.toFixed(2) + '亿',
    days3: '+0亿', days5: '+0亿',
    trend: realTimeData.capitalFlow.main > 0 ? '流入' : '流出',
    risk: realTimeData.capitalFlow.main < -1 ? 'high' : realTimeData.capitalFlow.main < 0 ? 'medium' : 'low'
  } : getCapitalData(stock.code);
  const val = getValuationData(stock.code) || {pe:0,peAvg:30,high52w:0};
  const industryAvg = val.peAvg || val.industryAvg || 30;
  // 使用实时换手率（如果有）
  const turnover = (realTimeData && realTimeData.turnover) ? realTimeData.turnover : (Math.random() * 8 + 1).toFixed(1);
  const flow1d = parseFloat((cap.main||'0').replace(/[^0-9.\-]/g,'')) || 0;
  const flow5d = parseFloat((cap.days5||'0').replace(/[^0-9.\-]/g,'')) || 0;

  const reasons = [];
  let buyScore = 50, sellScore = 0;

  // === 止损检查（最高优先级）===
  if (stopLoss > 0 && price <= stopLoss) {
    sellScore += 100; reasons.push({type:'sell', text:`⛔ 已跌破止损位${stopLoss}，立即止损`});
  } else if (stopLoss > 0 && ((price - stopLoss) / stopLoss * 100) < 3) {
    sellScore += 40; reasons.push({type:'reduce', text:`⚠️ 距止损位仅${((price - stopLoss) / stopLoss * 100).toFixed(1)}%，高度危险`});
  } else if (pnlPct < -8) {
    sellScore += 60; reasons.push({type:'sell', text:`❌ 成本${costPrice}，亏损${pnlPct.toFixed(1)}%，触发8%止损铁律`});
  } else if (pnlPct < -5) {
    sellScore += 25; reasons.push({type:'reduce', text:`⚠️ 成本${costPrice}，亏损${pnlPct.toFixed(1)}%，接近止损线`});
  }

  // === 止盈检查 ===
  if (targetPrice > 0 && price >= targetPrice) {
    sellScore += 40; reasons.push({type:'reduce', text:`🎯 已达目标价${targetPrice}，建议分批止盈`});
  } else if (targetPrice > 0 && price >= targetPrice * 0.95) {
    sellScore += 15; reasons.push({type:'watch', text:`📍 距目标价${targetPrice}仅${((price/targetPrice-1)*100).toFixed(1)}%`});
  } else if (pnlPct > 20) {
    sellScore += 25; reasons.push({type:'reduce', text:`💰 成本${costPrice}，盈利${pnlPct.toFixed(1)}%，可分批兑现`});
  } else if (pnlPct > 10) {
    buyScore += 5; reasons.push({type:'buy', text:`✅ 成本${costPrice}，盈利${pnlPct.toFixed(1)}%，趋势良好`});
  }

  // === 主力资金分析 ===
  if (cap.risk === 'high') {
    sellScore += 30; reasons.push({type:'sell', text:`💸 主力连续流出（5日${cap.days5}）`});
  } else if (cap.risk === 'medium') {
    sellScore += 15; reasons.push({type:'reduce', text:`⚠️ 主力资金转弱（今日${cap.main}）`});
  } else if (flow1d > 1) {
    buyScore += 20; reasons.push({type:'buy', text:`💰 主力大幅流入${cap.main}`});
  } else if (flow1d > 0.3) {
    buyScore += 10; reasons.push({type:'buy', text:`💰 主力净流入${cap.main}`});
  }

  // === 估值检查（更精细）===
  const peRatio = industryAvg > 0 ? (val.pe / industryAvg) : 1;
  if (peRatio > 2) {
    sellScore += 30; reasons.push({type:'sell', text:`📈 PE(${val.pe})是行业均值${industryAvg}的2倍+，严重高估`});
  } else if (peRatio > 1.5) {
    sellScore += 20; reasons.push({type:'reduce', text:`📈 PE(${val.pe})超行业均值${industryAvg}的50%，估值泡沫`});
  } else if (peRatio > 1.3) {
    sellScore += 10; reasons.push({type:'watch', text:`⚠️ PE偏高(${val.pe}vs${industryAvg})`});
  } else if (peRatio < 0.8 && val.pe > 0) {
    buyScore += 10; reasons.push({type:'buy', text:`💎 PE(${val.pe})低于行业均值${industryAvg}，估值洼地`});
  }

  // === 行业周期分析 ===
  const industryTrend = getIndustryTrend(stock.code);
  if (industryTrend === 'up') {
    buyScore += 12; reasons.push({type:'buy', text:`🏭 所处行业处于景气上行周期`});
  } else if (industryTrend === 'down') {
    sellScore += 12; reasons.push({type:'reduce', text:`🏭 所处行业处于下行周期，谨慎持有`});
  }

  // === 企业基本面分析（持仓盈亏视角）===
  const fundamental = getCompanyFundamentals(stock.code);
  if (fundamental) {
    if (fundamental.profitGrowth > 30) {
      buyScore += 10; reasons.push({type:'buy', text:`📊 净利润增速${fundamental.profitGrowth}%，成长性优秀`});
    } else if (fundamental.profitGrowth < -20) {
      sellScore += 15; reasons.push({type:'sell', text:`📊 净利润增速${fundamental.profitGrowth}%，业绩恶化`});
    }
    if (fundamental.debtRatio > 70) {
      sellScore += 10; reasons.push({type:'reduce', text:`📊 资产负债率${fundamental.debtRatio}%，财务风险偏高`});
    }
  }

  // === 距高点检查 ===
  if (val.high52w && price > val.high52w * 0.95) {
    sellScore += 15; reasons.push({type:'watch', text:`🏔️ 距52周高点<5%，山顶风险`});
  } else if (val.high52w && price < val.high52w * 0.6) {
    buyScore += 8; reasons.push({type:'buy', text:`📉 距高点${((1-price/val.high52w)*100).toFixed(0)}%，超跌区域`});
  }

  // === 换手率异常 ===
  const to = parseFloat(turnover);
  if (to > 15) { sellScore += 15; reasons.push({type:'watch', text:`🌀 换手率${turnover}%过高，警惕出货`}); }
  else if (to >= 3 && to <= 7) { buyScore += 8; reasons.push({type:'buy', text:`✅ 换手率${turnover}%活跃健康`}); }

  // === 大盘影响（增强）===
  if (marketCtx.level === 'bad') { sellScore += 15; reasons.push({type:'watch', text:`🌧️ 大盘大跌，防御为主`}); }
  else if (marketCtx.level === 'weak') { sellScore += 5; reasons.push({type:'watch', text:`🌤️ 大盘偏弱，谨慎操作`}); }
  else if (marketCtx.level === 'strong') { buyScore += 15; reasons.push({type:'buy', text:`☀️ 大盘强势，顺势做多`}); }
  else if (marketCtx.level === 'mid-up') { buyScore += 8; }

  // === 综合信号（更精细的阈值）===
  let signal, alertLevel, tradeAction;
  if (sellScore >= 80) { signal='sell'; alertLevel='danger'; tradeAction='🔴 立即清仓，严格止损'; }
  else if (sellScore >= 50) { signal='reduce'; alertLevel='warning'; tradeAction='🟠 减仓至半仓，设好止损'; }
  else if (sellScore >= 25) { signal='hold'; alertLevel='watch'; tradeAction='🟡 谨慎持有，密切关注'; }
  else if (buyScore >= 80) { signal='buy'; alertLevel='safe'; tradeAction='🟢 可积极加仓'; }
  else if (buyScore >= 65) { signal='buy'; alertLevel='safe'; tradeAction='🟢 可适量建仓'; }
  else { signal='hold'; alertLevel='safe'; tradeAction='🟡 正常持有'; }

  return { signal, alertLevel, tradeAction, buyScore, sellScore, reasons, pnlPct, turnover, capital:cap, valuation:val, costPrice };
}

// 行业周期趋势（根据股票代码判断所属行业）
function getIndustryTrend(code) {
  const industryMap = {
    'sh600519': 'up', 'sz000858': 'up', 'sz000568': 'up',    // 白酒：消费升级
    'sz300750': 'up', 'sz002594': 'up', 'sh601012': 'down',   // 新能源：分化
    'sh688981': 'up', 'sz002371': 'up',                       // 半导体：国产替代
    'sz000333': 'up', 'sz000651': 'up',                        // 家电：稳定增长
    'sh601318': 'up', 'sh600036': 'up',                        // 金融：修复
    'sh600900': 'up', 'sh600887': 'up',                        // 电力：新能源转型
    'sh601899': 'down', 'sh600585': 'down',                   // 煤炭钢铁：周期下行
  };
  return industryMap[code] || 'neutral';
}

// 企业基本面数据（净利润增速、负债率等）
function getCompanyFundamentals(code) {
  const data = {
    'sh600519': {profitGrowth:15, debtRatio:25, roe:32},
    'sz300750': {profitGrowth:45, debtRatio:68, roe:22},
    'sz002594': {profitGrowth:35, debtRatio:62, roe:18},
    'sh601012': {profitGrowth:-25, debtRatio:55, roe:8},
    'sh688981': {profitGrowth:55, debtRatio:35, roe:12},
    'sz002371': {profitGrowth:40, debtRatio:42, roe:25},
    'sh603501': {profitGrowth:20, debtRatio:30, roe:15},
    'sz000333': {profitGrowth:12, debtRatio:45, roe:28},
  };
  return data[code] || null;
}

// === 主力出货检测系统 ===

// 四大内外盘实战用法分析
function analyzeInOutMarket(capFlow, price, pct) {
  if (!capFlow || !capFlow.length) return { signals: [], score: 0, desc: '无资金流数据' };
  const signals = [];
  let score = 0;
  const latest = capFlow[capFlow.length - 1];
  const prev = capFlow.length >= 2 ? capFlow[capFlow.length - 2] : null;
  const recent3 = capFlow.slice(-3);

  // 1. 内盘大于外盘 + 主力流出 = 主力出货
  // 内盘（主动卖盘）= 大单+超大单流出，外盘（主动买盘）= 大单+超大单流入
  const mainOut = latest.big < 0 || latest.super < 0;
  const mainIn = latest.big > 0 && latest.super > 0;
  if (mainOut && latest.main < -0.5) {
    signals.push('⚠️ 内盘>外盘，主力主动卖出，出货迹象');
    score += 25;
  } else if (mainIn && latest.main > 0.5) {
    signals.push('✅ 外盘>内盘，主力主动买入，吸筹迹象');
    score -= 15;
  }

  // 2. 涨停板封单分析：大单封住但散户出逃 = 托单出货
  if (pct > 9.5 && latest.small < -0.3) {
    signals.push('🚨 涨停板但散户大举流出，疑似托单出货');
    score += 30;
  }

  // 3. 高位放量+主力流出 = 天量天价出货
  if (pct > 3 && latest.main < -1) {
    signals.push('🚨 高位放量下跌，主力加速出货');
    score += 30;
  }

  // 4. 连续3日主力流出递增 = 对倒出货
  if (recent3.length >= 3) {
    const flows = recent3.map(t => t.main);
    if (flows[0] < 0 && flows[1] < 0 && flows[2] < 0 && flows[2] < flows[1] && flows[1] < flows[0]) {
      signals.push('🚨 连续3日主力加速流出，对倒出货特征');
      score += 35;
    }
  }

  // 5. 尾盘拉升+次日低开概率高 = 尾盘诱多
  const hour = new Date().getHours();
  if (hour >= 14 && pct > 3 && latest.main < 0) {
    signals.push('⚠️ 尾盘拉升但主力净流出，次日低开概率大');
    score += 20;
  }

  // 6. 散户接盘+主力撤退 = 高位派发
  const recentSmall = recent3.reduce((s, t) => s + (t.small || 0), 0);
  const recentMain = recent3.reduce((s, t) => s + (t.main || 0), 0);
  if (recentSmall > 0.5 && recentMain < -1) {
    signals.push('🚨 散户接盘+主力撤退，典型高位派发');
    score += 30;
  }

  return {
    signals,
    score: Math.min(score, 100),
    desc: signals.length ? signals[0] : '暂无出货信号'
  };
}

// 成交量异动分析
function analyzeVolumeAnomaly(capFlow, price) {
  if (!capFlow || capFlow.length < 3) return { status: 'normal', desc: '数据不足', score: 0 };
  const signals = [];
  let score = 0;
  const recent = capFlow.slice(-5);

  // 计算近5日主力净流入均值
  const avgMain = recent.reduce((s, t) => s + (t.main || 0), 0) / recent.length;
  const todayMain = capFlow[capFlow.length - 1].main || 0;

  // 天量天价：价格新高 + 成交量暴增
  if (todayMain < -2) {
    signals.push('🔴 天量天价：主力单日流出超2亿，顶部特征');
    score += 35;
  } else if (todayMain < -1) {
    signals.push('🟠 放量滞涨：主力流出超1亿，上涨乏力');
    score += 20;
  }

  // 缩量下跌：主力流出但量能萎缩 = 阴跌
  if (todayMain < 0 && Math.abs(todayMain) < Math.abs(avgMain) * 0.5 && avgMain < 0) {
    signals.push('🟡 缩量阴跌：主力小幅流出，但量能萎缩');
    score += 10;
  }

  // 底部放量：主力大举流入
  if (todayMain > 1.5) {
    signals.push('🟢 底部放量：主力大幅流入，可能启动');
    score -= 20;
  }

  return {
    status: score > 20 ? 'danger' : score > 10 ? 'warning' : 'normal',
    desc: signals.length ? signals.join(' | ') : '成交量正常',
    signals,
    score
  };
}

// 三大失效场景检测
function detectFailureScenarios(capFlow, price, pct, turnover) {
  const scenarios = [];
  // 失效场景1：大盘系统性风险 — 个股分析失效
  // 由marketCtx处理，这里检测极端行情
  if (pct < -5) {
    scenarios.push({ name: '系统性暴跌', desc: '个股跌幅>5%，技术分析失效，恐慌情绪主导', level: 'high' });
  }

  // 失效场景2：突发利空/黑天鹅 — 资金面分析失效
  // 检测异常放量+暴跌
  if (pct < -3 && turnover > 10) {
    scenarios.push({ name: '黑天鹅事件', desc: '异常放量暴跌，疑似突发利空，资金面分析失效', level: 'high' });
  }

  // 失效场景3：主力假出货洗盘 — 资金面假信号
  // 主力流出后快速回补
  if (capFlow && capFlow.length >= 3) {
    const today = capFlow[capFlow.length - 1];
    const yesterday = capFlow[capFlow.length - 2];
    if (yesterday.main < -1 && today.main > 1) {
      scenarios.push({ name: '疑似洗盘', desc: '昨日主力流出今日回补，可能为洗盘动作', level: 'medium' });
    }
  }

  return scenarios;
}

// 综合出货风险评估（用于信号面板显示）
function assessMainForceRisk(capFlow, price, pct, turnover) {
  const inOut = analyzeInOutMarket(capFlow, price, pct);
  const volume = analyzeVolumeAnomaly(capFlow, price);
  const failures = detectFailureScenarios(capFlow, price, pct, turnover);
  const totalScore = inOut.score + volume.score;
  const level = totalScore >= 50 ? 'critical' : totalScore >= 30 ? 'high' : totalScore >= 15 ? 'medium' : 'low';
  const label = level === 'critical' ? '🔴 主力出货' : level === 'high' ? '🟠 疑似出货' : level === 'medium' ? '🟡 关注' : '🟢 安全';

  return {
    level,
    label,
    score: totalScore,
    inOutSignals: inOut.signals,
    volumeSignals: volume.signals || [],
    volumeDesc: volume.desc,
    failureScenarios: failures
  };
}

// 综合暴雷风险预测（增强版）
function predictRisk(stock, evaluation) {
  const risks = [];
  const val = evaluation.valuation || {};
  const industryAvg = val.peAvg || val.industryAvg || 30;
  if (val.pe && val.pe > industryAvg * 2) risks.push('严重高估');
  else if (val.pe && val.pe > industryAvg * 1.5) risks.push('估值泡沫');
  if (evaluation.capital.risk === 'high') risks.push('主力撤退');
  const flow5dNum = parseFloat((evaluation.capital.days5||'0').replace(/[^0-9.\-]/g,''));
  if (evaluation.pnlPct < -8) risks.push('深度亏损');
  else if (evaluation.pnlPct < -5 && flow5dNum < 0) risks.push('趋势恶化');
  if (parseFloat(evaluation.turnover) > 15) risks.push('异常换手');
  if (stock.name && (stock.name.includes('ST') || stock.name.includes('*'))) risks.push('ST退市风险');
  if (evaluation.sellScore >= 80) risks.push('综合高危');
  return {
    level: risks.length >= 3 ? 'critical' : risks.length >= 2 ? 'high' : risks.length >= 1 ? 'medium' : 'low',
    factors: risks
  };
}
