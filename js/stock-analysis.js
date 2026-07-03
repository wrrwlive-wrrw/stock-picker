// 股票深度分析：排雷 + 买入评级
// 数据源：东方财富 + 同花顺（通过 fetchStockDetail 统一获取）

// 综合评分排雷模块
function analyzeStock(data, code) {
  const risks = [];
  const positives = [];
  let score = 60; // 基础分

  const pe = parseFloat(data.pe) || 0;
  const pb = parseFloat(data.pb) || 0;
  const pct = parseFloat(data.pct) || 0;
  const turnover = parseFloat(data.turnover) || 0;
  const volRatio = parseFloat(data.volRatio) || 0;

  // 估值排雷
  if (pe > 100) { risks.push({level:'high', text:`PE高达${pe.toFixed(1)}倍，估值严重泡沫化`}); score -= 15; }
  else if (pe > 60) { risks.push({level:'medium', text:`PE=${pe.toFixed(1)}倍偏高，注意估值风险`}); score -= 8; }
  else if (pe > 0 && pe < 15) { positives.push(`PE=${pe.toFixed(1)}倍处于低估区间`); score += 8; }

  if (pb > 10) { risks.push({level:'medium', text:`PB=${pb.toFixed(1)}倍过高，资产泡沫风险`}); score -= 5; }
  else if (pb > 0 && pb < 1) { positives.push(`PB=${pb.toFixed(2)}破净，资产折价`); score += 5; }

  // 亏损排雷
  if (pe < 0) { risks.push({level:'high', text:'公司亏损，PE为负'}); score -= 12; }

  // 换手率分析
  if (turnover > 15) { risks.push({level:'medium', text:`换手率${turnover.toFixed(1)}%过高，可能是主力对倒出货`}); score -= 6; }
  else if (turnover >= 3 && turnover <= 7) { positives.push(`换手率${turnover.toFixed(1)}%处于活跃区间`); score += 5; }

  // 量比分析
  if (volRatio > 2 && pct > 0) { positives.push(`量比${volRatio.toFixed(2)}放量上涨`); score += 8; }
  else if (volRatio > 2 && pct < -3) { risks.push({level:'high', text:`量比${volRatio.toFixed(2)}放量下跌，主力出逃`}); score -= 10; }

  // 涨跌幅分析
  if (pct < -8) { risks.push({level:'high', text:`今日暴跌${pct.toFixed(2)}%，趋势恶化`}); score -= 8; }
  if (pct > 9) { risks.push({level:'medium', text:`涨幅${pct.toFixed(2)}%接近涨停，追高风险`}); score -= 3; }

  // ST排雷
  if (data.name && (data.name.includes('ST') || data.name.includes('*'))) {
    risks.push({level:'high', text:'ST/*ST 股，退市风险'});
    score -= 20;
  }

  score = Math.max(0, Math.min(100, score));

  // 评级
  let rating, ratingColor, ratingDesc;
  if (score >= 85) { rating='强烈推荐买入'; ratingColor='#16c784'; ratingDesc='各维度信号一致，胜率高'; }
  else if (score >= 70) { rating='推荐买入'; ratingColor='#3fb950'; ratingDesc='基本面/技术面较好，可分批建仓'; }
  else if (score >= 55) { rating='中性观望'; ratingColor='#d29922'; ratingDesc='信号不明确，等待更好时机'; }
  else if (score >= 40) { rating='谨慎减仓'; ratingColor='#f0883e'; ratingDesc='存在多个风险点，建议控制仓位'; }
  else { rating='不建议买入'; ratingColor='#ea3943'; ratingDesc='高风险股票，坚决回避'; }

  return { score, rating, ratingColor, ratingDesc, risks, positives };
}

// 渲染排雷+评级卡片
function renderAnalysis(data, code) {
  const a = analyzeStock(data, code);
  return `<div class="card" style="border-color:${a.ratingColor}">
    <div class="card-title" style="color:${a.ratingColor}">
      🎯 综合评级：${a.rating}
      <span style="float:right;font-size:14px">评分 <b style="font-size:22px">${a.score}</b>/100</span>
    </div>
    <div class="tip-box" style="border-left-color:${a.ratingColor}">
      <b>结论：</b>${a.ratingDesc}
    </div>
    ${renderRiskList(a.risks)}
    ${renderPositiveList(a.positives)}
    ${renderOperationAdvice(a.score, data)}
  </div>`;
}

function renderRiskList(risks) {
  if (!risks.length) return '<div style="margin-top:10px;color:#16c784;font-size:13px">✅ 未发现明显风险点</div>';
  return `<div style="margin-top:12px">
    <h4 style="color:#ea3943;margin-bottom:6px">⚠️ 风险排雷</h4>
    ${risks.map(r=>`<div style="padding:6px 0;border-bottom:1px solid #21262d;display:flex;gap:8px;align-items:center">
      <span class="factor-tag ${r.level==='high'?'tag-negative':'tag-neutral'}">${r.level==='high'?'高危':'注意'}</span>
      <span style="font-size:13px">${r.text}</span>
    </div>`).join('')}
  </div>`;
}

function renderPositiveList(pos) {
  if (!pos.length) return '';
  return `<div style="margin-top:12px">
    <h4 style="color:#16c784;margin-bottom:6px">✅ 积极因素</h4>
    ${pos.map(p=>`<div style="padding:4px 0;font-size:13px;color:#16c784">• ${p}</div>`).join('')}
  </div>`;
}

function renderOperationAdvice(score, data) {
  const price = parseFloat(data.price) || 0;
  let advice = '';
  if (score >= 70) {
    advice = `<b>操作建议：</b>可分3批建仓，首次30%仓位（价格${(price*0.98).toFixed(2)}附近），
      回调至${(price*0.95).toFixed(2)}加仓40%，突破${(price*1.03).toFixed(2)}再加30%。
      止损位设在${(price*0.92).toFixed(2)}。`;
  } else if (score >= 55) {
    advice = `<b>操作建议：</b>暂不介入，等待明确信号。若回调至${(price*0.9).toFixed(2)}且缩量企稳可轻仓试探。`;
  } else {
    advice = `<b>操作建议：</b>不建议买入。持仓者建议在反弹至${(price*1.05).toFixed(2)}时减仓，
      跌破${(price*0.9).toFixed(2)}坚决止损。`;
  }
  return `<div class="tip-box" style="margin-top:12px">${advice}
    <div style="margin-top:8px;font-size:11px;color:#8b949e">
      免责声明：本评级基于公开数据算法生成，仅供参考，不构成投资建议。股市有风险，入市需谨慎。
    </div>
  </div>`;
}
