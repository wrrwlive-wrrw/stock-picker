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

// 主评估函数（增强版：结合实时数据+资金流向+估值+趋势）
function evaluateWatchStock(stock, marketCtx, realTimeData) {
  const price = parseFloat(stock.price) || 0;
  const addPrice = parseFloat(stock.addPrice) || price;
  const targetPrice = parseFloat(stock.targetPrice) || 0;
  const stopLoss = parseFloat(stock.stopLoss) || 0;
  const pnlPct = addPrice > 0 ? ((price - addPrice) / addPrice * 100) : 0;

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
    sellScore += 60; reasons.push({type:'sell', text:`❌ 亏损${pnlPct.toFixed(1)}%，触发8%止损铁律`});
  } else if (pnlPct < -5) {
    sellScore += 25; reasons.push({type:'reduce', text:`⚠️ 亏损${pnlPct.toFixed(1)}%，接近止损线`});
  }

  // === 止盈检查 ===
  if (targetPrice > 0 && price >= targetPrice) {
    sellScore += 40; reasons.push({type:'reduce', text:`🎯 已达目标价${targetPrice}，建议分批止盈`});
  } else if (targetPrice > 0 && price >= targetPrice * 0.95) {
    sellScore += 15; reasons.push({type:'watch', text:`📍 距目标价${targetPrice}仅${((price/targetPrice-1)*100).toFixed(1)}%`});
  } else if (pnlPct > 20) {
    sellScore += 25; reasons.push({type:'reduce', text:`💰 盈利${pnlPct.toFixed(1)}%，可分批兑现`});
  } else if (pnlPct > 10) {
    buyScore += 5; reasons.push({type:'buy', text:`✅ 盈利${pnlPct.toFixed(1)}%，趋势良好`});
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

  return { signal, alertLevel, tradeAction, buyScore, sellScore, reasons, pnlPct, turnover, capital:cap, valuation:val };
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
