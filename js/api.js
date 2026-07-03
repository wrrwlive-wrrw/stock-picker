// API封装、缓存、示例数据
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 缓存读取
function getCache(key) {
  const item = localStorage.getItem('stock_cache_' + key);
  if (!item) return null;
  const { data, time } = JSON.parse(item);
  if (Date.now() - time > CACHE_DURATION) { localStorage.removeItem('stock_cache_' + key); return null; }
  return data;
}
function setCache(key, data) {
  localStorage.setItem('stock_cache_' + key, JSON.stringify({ data, time: Date.now() }));
}

// A股指数示例数据（API不可用时兜底）
const SAMPLE_INDEX = {
  sh000001: { name:'上证指数', value:3256.78, change:12.35, pct:0.38 },
  sz399001: { name:'深证成指', value:10234.56, change:-45.23, pct:-0.44 },
  sz399006: { name:'创业板指', value:2045.67, change:23.45, pct:1.16 },
  dji: { name:'道琼斯', value:42156.89, change:234.56, pct:0.56 },
  ixic: { name:'纳斯达克', value:19234.12, change:-89.34, pct:-0.46 },
  spx: { name:'标普500', value:5823.45, change:15.67, pct:0.27 }
};

// A股个股示例数据
const SAMPLE_STOCKS = {
  sh600519: { name:'贵州茅台', price:1756.00, change:12.50, pct:0.72, pe:28.5, pb:9.2, volume:'2.3万手' },
  sz000858: { name:'五粮液', price:145.60, change:-1.20, pct:-0.82, pe:22.1, pb:5.8, volume:'4.1万手' },
  sh601318: { name:'中国平安', price:52.30, change:0.80, pct:1.55, pe:8.9, pb:1.2, volume:'8.5万手' },
  sz300750: { name:'宁德时代', price:218.50, change:5.60, pct:2.63, pe:35.2, pb:6.1, volume:'5.2万手' }
};

// 获取A股实时数据（腾讯接口）
async function fetchAStockQuote(code) {
  const cached = getCache(code);
  if (cached) return cached;
  try {
    const url = `${CORS_PROXY}${encodeURIComponent('http://qt.gtimg.cn/q=' + code)}`;
    const res = await fetch(url);
    const text = await res.text();
    const data = parseQQQuote(text, code);
    if (data) setCache(code, data);
    return data;
  } catch(e) {
    console.warn('API请求失败，使用示例数据', e);
    return SAMPLE_STOCKS[code] || null;
  }
}

// 解析腾讯股票数据
function parseQQQuote(text, code) {
  const parts = text.split('~');
  if (parts.length < 45) return SAMPLE_STOCKS[code] || null;
  return {
    name: parts[1], price: parseFloat(parts[3]), change: parseFloat(parts[31]),
    pct: parseFloat(parts[32]), volume: parts[6] + '手', high: parseFloat(parts[33]),
    low: parseFloat(parts[34]), open: parseFloat(parts[5]), prevClose: parseFloat(parts[4]),
    pe: parseFloat(parts[39]) || 0, pb: parseFloat(parts[46]) || 0
  };
}

// 获取指数数据
async function fetchIndexData() {
  const cached = getCache('all_index');
  if (cached) return cached;
  try {
    const codes = 'sh000001,sz399001,sz399006';
    const url = `${CORS_PROXY}${encodeURIComponent('http://qt.gtimg.cn/q=' + codes)}`;
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split(';').filter(l => l.trim());
    const result = {};
    lines.forEach(line => {
      const match = line.match(/v_(\w+)="(.+)"/);
      if (!match) return;
      const [, code, data] = match;
      const p = data.split('~');
      if (p.length > 32) {
        result[code] = { name:p[1], value:parseFloat(p[3]), change:parseFloat(p[31]), pct:parseFloat(p[32]) };
      }
    });
    if (Object.keys(result).length > 0) { setCache('all_index', result); return result; }
  } catch(e) { console.warn('指数API失败', e); }
  return SAMPLE_INDEX;
}

// 生成模拟K线数据
function generateKlineData(basePrice, days) {
  const data = [];
  let price = basePrice;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const change = (Math.random() - 0.48) * basePrice * 0.03;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.01;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.01;
    const vol = Math.floor(Math.random() * 50000 + 10000);
    data.push({ date: d.toISOString().slice(0,10), open, close, high, low, vol });
    price = close;
  }
  return data;
}

// 东方财富API封装
const EM_QUOTE_URL = 'https://push2.eastmoney.com/api/qt/stock/get';
const EM_CAPITAL_URL = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get';

// 转换代码格式：sh600519 -> 1.600519, sz000858 -> 0.000858
function toEMCode(code) {
  if (code.startsWith('sh')) return '1.' + code.slice(2);
  if (code.startsWith('sz')) return '0.' + code.slice(2);
  return code;
}

// 获取东方财富详细行情
async function fetchEMStockDetail(code) {
  const cached = getCache('em_' + code);
  if (cached) return cached;
  try {
    const emCode = toEMCode(code);
    const fields = 'f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f163,f167,f168,f169,f170,f171,f173,f177,f183,f184,f185,f186,f187,f188,f189,f190,f191,f192';
    const url = `${CORS_PROXY}${encodeURIComponent(EM_QUOTE_URL+'?secid='+emCode+'&fields='+fields)}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.data) { setCache('em_'+code, json.data); return json.data; }
  } catch(e) { console.warn('东方财富API失败', e); }
  return null;
}

// 获取东方财富资金流向（近10日）
async function fetchEMCapitalFlow(code) {
  const cached = getCache('em_cap_' + code);
  if (cached) return cached;
  try {
    const emCode = toEMCode(code);
    const url = `${CORS_PROXY}${encodeURIComponent(EM_CAPITAL_URL+'?secid='+emCode+'&klt=101&lmt=10&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57')}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.data && json.data.klines) {
      const result = json.data.klines.map(k => {
        const p = k.split(',');
        return {date:p[0], main:parseFloat(p[1])/1e8, super:parseFloat(p[2])/1e8, big:parseFloat(p[3])/1e8, mid:parseFloat(p[4])/1e8, small:parseFloat(p[5])/1e8};
      });
      setCache('em_cap_'+code, result);
      return result;
    }
  } catch(e) { console.warn('资金流向API失败', e); }
  return null;
}
