// API封装、缓存、示例数据
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 带多代理fallback的fetch（支持GBK/GB2312编码）
async function fetchWithProxy(url, encoding) {
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      if (encoding) {
        const buf = await res.arrayBuffer();
        return new TextDecoder(encoding).decode(buf);
      }
      return await res.text();
    } catch(e) { continue; }
  }
  throw new Error('所有代理均不可用');
}

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

// A股个股示例数据（扩展覆盖主流股票，API不可用时兜底）
const SAMPLE_STOCKS = {
  sh600519: { name:'贵州茅台', price:1756.00, change:12.50, pct:0.72, pe:28.5, pb:9.2, volume:'2.3万手' },
  sz000858: { name:'五粮液', price:145.60, change:-1.20, pct:-0.82, pe:22.1, pb:5.8, volume:'4.1万手' },
  sh601318: { name:'中国平安', price:52.30, change:0.80, pct:1.55, pe:8.9, pb:1.2, volume:'8.5万手' },
  sz300750: { name:'宁德时代', price:218.50, change:5.60, pct:2.63, pe:35.2, pb:6.1, volume:'5.2万手' },
  sh600036: { name:'招商银行', price:35.80, change:0.45, pct:1.27, pe:6.8, pb:1.1, volume:'12.1万手' },
  sz002594: { name:'比亚迪', price:268.50, change:8.30, pct:3.19, pe:22.5, pb:5.3, volume:'6.8万手' },
  sh601012: { name:'隆基绿能', price:18.25, change:-0.65, pct:-3.44, pe:12.3, pb:1.8, volume:'15.2万手' },
  sz000333: { name:'美的集团', price:62.80, change:1.20, pct:1.95, pe:13.2, pb:4.1, volume:'7.5万手' },
  sh688981: { name:'中芯国际', price:52.60, change:2.10, pct:4.16, pe:45.2, pb:2.8, volume:'8.9万手' },
  sz002371: { name:'北方华创', price:338.50, change:12.80, pct:3.92, pe:52.1, pb:8.5, volume:'3.2万手' },
  sh603501: { name:'韦尔股份', price:88.50, change:-2.30, pct:-2.53, pe:35.6, pb:4.2, volume:'5.1万手' },
  sh600030: { name:'中信证券', price:22.80, change:0.35, pct:1.56, pe:15.8, pb:1.3, volume:'18.5万手' },
  sh600276: { name:'恒瑞医药', price:42.50, change:0.85, pct:2.04, pe:55.2, pb:8.9, volume:'6.2万手' },
  sz300760: { name:'迈瑞医疗', price:285.00, change:5.50, pct:1.97, pe:38.5, pb:12.1, volume:'2.1万手' },
  sz300059: { name:'东方财富', price:16.80, change:0.25, pct:1.51, pe:28.3, pb:4.5, volume:'22.3万手' },
  sz002475: { name:'立讯精密', price:32.50, change:0.80, pct:2.52, pe:25.6, pb:5.2, volume:'9.8万手' },
  sz002415: { name:'海康威视', price:28.90, change:-0.45, pct:-1.53, pe:18.5, pb:4.8, volume:'11.2万手' },
  sh603259: { name:'药明康德', price:48.20, change:1.10, pct:2.34, pe:18.9, pb:3.5, volume:'7.8万手' },
  sh600900: { name:'长江电力', price:28.50, change:0.15, pct:0.53, pe:18.2, pb:3.2, volume:'8.5万手' },
  sh601088: { name:'中国神华', price:35.20, change:0.60, pct:1.73, pe:9.5, pb:1.6, volume:'10.2万手' },
  sh601899: { name:'紫金矿业', price:16.80, change:0.35, pct:2.13, pe:12.8, pb:3.5, volume:'18.5万手' },
  sz000651: { name:'格力电器', price:38.50, change:0.45, pct:1.18, pe:8.5, pb:2.8, volume:'9.2万手' },
  sz000002: { name:'万科A', price:8.50, change:-0.25, pct:-2.86, pe:-5.2, pb:0.5, volume:'25.3万手' },
  sh600760: { name:'中航沈飞', price:48.50, change:1.80, pct:3.85, pe:62.5, pb:6.8, volume:'5.5万手' },
  sh600893: { name:'航发动力', price:38.20, change:0.95, pct:2.55, pe:85.2, pb:4.5, volume:'6.8万手' },
  sz000977: { name:'浪潮信息', price:28.50, change:1.20, pct:4.40, pe:32.5, pb:5.8, volume:'12.5万手' },
  sh688111: { name:'金山办公', price:285.00, change:8.50, pct:3.07, pe:85.2, pb:15.6, volume:'1.8万手' },
  sz300308: { name:'中际旭创', price:88.50, change:3.20, pct:3.75, pe:28.5, pb:6.2, volume:'8.5万手' },
  sh601138: { name:'工业富联', price:18.50, change:0.45, pct:2.49, pe:18.5, pb:3.2, volume:'15.8万手' },
  sh600585: { name:'海螺水泥', price:25.80, change:0.35, pct:1.37, pe:7.5, pb:0.9, volume:'8.2万手' },
  sh601857: { name:'中国石油', price:8.50, change:0.15, pct:1.80, pe:8.2, pb:0.8, volume:'22.5万手' },
  sh600028: { name:'中国石化', price:5.80, change:0.10, pct:1.75, pe:7.5, pb:0.6, volume:'18.8万手' },
  sh601288: { name:'农业银行', price:3.85, change:0.05, pct:1.32, pe:5.2, pb:0.6, volume:'35.2万手' },
  sh601398: { name:'工商银行', price:5.80, change:0.08, pct:1.40, pe:5.5, pb:0.6, volume:'28.5万手' },
  sh600016: { name:'民生银行', price:4.20, change:0.05, pct:1.20, pe:4.2, pb:0.4, volume:'15.8万手' },
  sh601166: { name:'兴业银行', price:18.50, change:0.25, pct:1.37, pe:5.2, pb:0.6, volume:'12.5万手' },
  sz000001: { name:'平安银行', price:12.50, change:0.15, pct:1.21, pe:5.8, pb:0.6, volume:'18.2万手' },
  sh600809: { name:'山西汾酒', price:198.50, change:5.50, pct:2.85, pe:35.2, pb:12.5, volume:'2.5万手' },
  sz000568: { name:'泸州老窖', price:158.00, change:3.80, pct:2.46, pe:22.5, pb:8.5, volume:'3.2万手' },
  sh600887: { name:'伊利股份', price:28.50, change:0.45, pct:1.60, pe:18.5, pb:5.2, volume:'8.8万手' },
  sz002714: { name:'牧原股份', price:42.50, change:1.20, pct:2.91, pe:-12.5, pb:4.8, volume:'7.5万手' },
  sh600519: { name:'贵州茅台', price:1756.00, change:12.50, pct:0.72, pe:28.5, pb:9.2, volume:'2.3万手' }
};

// 获取A股实时数据（腾讯接口，多代理fallback，GBK编码）
async function fetchAStockQuote(code) {
  const cached = getCache('quote_' + code);
  if (cached) return cached;
  try {
    const url = 'http://qt.gtimg.cn/q=' + code;
    const text = await fetchWithProxy(url, 'gbk');
    const data = parseQQQuote(text, code);
    if (data) { setCache('quote_' + code, data); return data; }
  } catch(e) {
    console.warn('行情API失败', code, e.message);
  }
  // 兜底：用SAMPLE_STOCKS精确匹配
  if (SAMPLE_STOCKS[code]) return SAMPLE_STOCKS[code];
  // 模糊匹配：code只取后6位
  const pureCode = code.replace(/^(sh|sz)/, '');
  for (const [k, v] of Object.entries(SAMPLE_STOCKS)) {
    if (k.endsWith(pureCode)) return v;
  }
  return null;
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

// 获取指数数据（多代理fallback，GBK编码）
async function fetchIndexData() {
  const cached = getCache('all_index');
  if (cached) return cached;
  try {
    const codes = 'sh000001,sz399001,sz399006';
    const url = 'http://qt.gtimg.cn/q=' + codes;
    const text = await fetchWithProxy(url, 'gbk');
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

// 获取东方财富详细行情（多代理fallback）
async function fetchEMStockDetail(code) {
  const cached = getCache('em_' + code);
  if (cached) return cached;
  try {
    const emCode = toEMCode(code);
    const fields = 'f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f163,f167,f168,f169,f170,f171,f173,f177,f183,f184,f185,f186,f187,f188,f189,f190,f191,f192';
    const url = EM_QUOTE_URL+'?secid='+emCode+'&fields='+fields;
    const text = await fetchWithProxy(url);
    const json = JSON.parse(text);
    if (json.data) { setCache('em_'+code, json.data); return json.data; }
  } catch(e) { console.warn('东方财富API失败', e); }
  return null;
}

// 获取东方财富资金流向（近10日，多代理fallback）
async function fetchEMCapitalFlow(code) {
  const cached = getCache('em_cap_' + code);
  if (cached) return cached;
  try {
    const emCode = toEMCode(code);
    const url = EM_CAPITAL_URL+'?secid='+emCode+'&klt=101&lmt=10&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57';
    const text = await fetchWithProxy(url);
    const json = JSON.parse(text);
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

// 腾讯智能搜索API - 根据关键词模糊匹配股票（多代理fallback，GBK编码）
async function searchStockByKeyword(keyword) {
  if (!keyword || keyword.length < 1) return [];
  const cacheKey = 'search_' + keyword;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  try {
    const searchUrl = 'http://smartbox.gtimg.cn/s3/?v=2&q=' + encodeURIComponent(keyword) + '&t=gp';
    const text = await fetchWithProxy(searchUrl, 'gbk');
    const match = text.match(/v_hint="(.+)"/);
    if (!match || !match[1]) return [];
    const items = match[1].split('^');
    const results = [];
    items.forEach(item => {
      const parts = item.split('~');
      if (parts.length >= 3 && (parts[1] === 'sh' || parts[1] === 'sz')) {
        results.push({ code: parts[1] + parts[2], name: parts[3] || parts[2] });
      }
    });
    if (results.length > 0) setCache(cacheKey, results);
    return results;
  } catch(e) {
    console.warn('腾讯搜索API失败', e);
    return [];
  }
}
