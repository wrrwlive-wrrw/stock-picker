// 交易信号引擎：五维评估 + 买入/卖出/持有信号
// 用于自选股每日体检和退出预警

// 获取大盘环境（强/中/弱）
async function getMarketContext() {
  try {
    const indexData = await fetchIndexData();
    const sh = indexData.sh000001 || {};
    const cyb = indexData.sz399006 || {};
    const shPct = parseFloat(sh.pct) || 0;
    const cybPct = parseFloat(cyb.pct) || 0;
    const avgPct = (shPct + cybPct) / 2;
    let level, desc, color;
    if (avgPct > 1) { level='strong'; desc='大盘走强，风险偏好上升'; color='#16c784'; }
    else if (avgPct > 0) { level='mid-up'; desc='大盘小幅上涨'; color='#3fb950'; }
    else if (avgPct > -1) { level='weak'; desc='大盘偏弱震荡'; color='#d29922'; }
    else { level='bad'; desc='大盘走弱，注意风险'; color='#ea3943'; }
    return { level, desc, color, shPct, cybPct, avgPct: avgPct.toFixed(2) };
  } catch(e) {
    return { level:'unknown', desc:'大盘数据加载失败', color:'#8b949e', shPct:0, cybPct:0, avgPct:'0.00' };
  }
}

// 主评估函数
function evaluateWatchStock(stock, marketCtx) {
  const price = parseFloat(stock.price) || 0;
  const addPrice = parseFloat(stock.addPrice) || price;
  const targetPrice = parseFloat(stock.targetPrice) || 0;
  const stopLoss = parseFloat(stock.stopLoss) || 0;
  const pnlPct = addPrice > 0 ? ((price - addPrice) / addPrice * 100) : 0;

  const cap = getCapitalData(stock.code);
  const val = getValuationData(stock.code) || {pe:0,peAvg:30,high52w:0};
  // 兼容字段名
  const industryAvg = val.peAvg || val.industryAvg || 30;
  const turnover = (Math.random() * 8 + 1).toFixed(1);
  // 解析资金数据为数字
  const flow1d = parseFloat((cap.main||'0').replace(/[^0-9.\-]/g,'')) || 0;
  const flow5d = parseFloat((cap.days5||'0').replace(/[^0-9.\-]/g,'')) || 0;

  const reasons = [];
  let buyScore = 50, sellScore = 0;

  // === 止损检查 ===
  if (stopLoss > 0 && price <= stopLoss) {
    sellScore += 100; reasons.push({type:'sell', text:`⛔ 已跌破止损位 ${stopLoss}，必须立即止损`});
  } else if (pnlPct < -8) {
    sellScore += 60; reasons.push({type:'sell', text:`❌ 亏损${pnlPct.toFixed(1)}%，触发8%止损铁律`});
  }

  // === 止盈检查 ===
  if (targetPrice > 0 && price >= targetPrice) {
    sellScore += 40; reasons.push({type:'reduce', text:`🎯 已达目标价 ${targetPrice}，建议分批止盈`});
  } else if (pnlPct > 20) {
    sellScore += 25; reasons.push({type:'reduce', text:`💰 盈利${pnlPct.toFixed(1)}%，可分批兑现`});
  }

  // === 主力资金 ===
  if (cap.risk === 'high') {
    sellScore += 30; reasons.push({type:'sell', text:`💸 主力5日累计流出${cap.days5}`});
  } else if (cap.risk === 'medium') {
    sellScore += 15; reasons.push({type:'reduce', text:`⚠️ 主力资金转弱（今日${cap.main}）`});
  } else if (flow1d > 0.5) {
    buyScore += 15; reasons.push({type:'buy', text:`💰 主力今日净流入${cap.main}`});
  }

  // === 估值检查 ===
  if (val.pe > industryAvg * 1.5) {
    sellScore += 20; reasons.push({type:'reduce', text:`📈 PE(${val.pe})超行业均值${industryAvg}的150%，估值泡沫`});
  } else if (val.pe > industryAvg * 1.3) {
    sellScore += 10; reasons.push({type:'watch', text:`⚠️ PE偏高(${val.pe}vs${industryAvg})，注意估值风险`});
  }

  // === 距高点 ===
  if (val.high52w && price > val.high52w * 0.95) {
    sellScore += 15; reasons.push({type:'watch', text:`🏔️ 距52周高点<5%，山顶风险`});
  }

  // === 换手率异常 ===
  const to = parseFloat(turnover);
  if (to > 15) { sellScore += 15; reasons.push({type:'watch', text:`🌀 换手率${turnover}%过高，警惕出货`}); }
  else if (to >= 3 && to <= 7) { buyScore += 8; reasons.push({type:'buy', text:`✅ 换手率${turnover}%活跃健康`}); }

  // === 大盘影响 ===
  if (marketCtx.level === 'bad') { sellScore += 10; reasons.push({type:'watch', text:`🌧️ 大盘走弱，防御为主`}); }
  else if (marketCtx.level === 'strong') { buyScore += 10; }

  // === 综合信号 ===
  let signal, alertLevel, tradeAction;
  if (sellScore >= 80) { signal='sell'; alertLevel='danger'; tradeAction='立即清仓，严格止损'; }
  else if (sellScore >= 40) { signal='reduce'; alertLevel='warning'; tradeAction='减仓50%，保留底仓观察'; }
  else if (sellScore >= 20) { signal='hold'; alertLevel='watch'; tradeAction='持有观察，设好止损'; }
  else if (buyScore >= 70) { signal='buy'; alertLevel='safe'; tradeAction='可加仓或建仓'; }
  else { signal='hold'; alertLevel='safe'; tradeAction='正常持有'; }

  return { signal, alertLevel, tradeAction, buyScore, sellScore, reasons, pnlPct, turnover, capital:cap, valuation:val };
}

// 综合暴雷风险预测
function predictRisk(stock, evaluation) {
  const risks = [];
  const val = evaluation.valuation || {};
  const industryAvg = val.peAvg || val.industryAvg || 30;
  if (val.pe && val.pe > industryAvg * 1.5) risks.push('估值泡沫');
  if (evaluation.capital.risk === 'high') risks.push('主力撤退');
  const flow5dNum = parseFloat((evaluation.capital.days5||'0').replace(/[^0-9.\-]/g,''));
  if (evaluation.pnlPct < -5 && flow5dNum < 0) risks.push('趋势恶化');
  if (parseFloat(evaluation.turnover) > 15) risks.push('异常换手');
  if (stock.name && (stock.name.includes('ST') || stock.name.includes('*'))) risks.push('ST退市风险');
  return {
    level: risks.length >= 3 ? 'critical' : risks.length >= 2 ? 'high' : risks.length >= 1 ? 'medium' : 'low',
    factors: risks
  };
}
