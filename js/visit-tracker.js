(function () {
  const DEFAULT_ANALYTICS_BASE = "https://fengcl-homepage-analytics.fengcl990212.workers.dev";
  const OFFLINE_KEY = "fcl_analytics_offline_v1";
  const QUEUE_KEY = "fcl_analytics_queue_v1";
  const VISITOR_KEY = "fcl_visitor_id_v1";
  const configuredBase = typeof window !== "undefined" && typeof window.__ANALYTICS_BASE__ === "string"
    ? window.__ANALYTICS_BASE__.trim()
    : "";
  const analyticsBase = (configuredBase || DEFAULT_ANALYTICS_BASE).replace(/\/+$/, "");
  const endpoint = `${analyticsBase}/api/visit`;
  const visit = {
    path: location.pathname + location.search,
    title: document.title || "",
    referrer: document.referrer || ""
  };

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  }

  function dayKey(ts) {
    return new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  }

  function getVisitorId() {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_KEY, created);
    return created;
  }

  function normalizeProvince(name) {
    const raw = String(name || "").trim();
    if (!raw) return "未知";
    const map = {
      "北京市": "北京", "北京": "北京",
      "上海市": "上海", "上海": "上海",
      "天津市": "天津", "天津": "天津",
      "重庆市": "重庆", "重庆": "重庆",
      "河北省": "河北", "河北": "河北",
      "山西省": "山西", "山西": "山西",
      "辽宁省": "辽宁", "辽宁": "辽宁",
      "吉林省": "吉林", "吉林": "吉林",
      "黑龙江省": "黑龙江", "黑龙江": "黑龙江",
      "江苏省": "江苏", "江苏": "江苏",
      "浙江省": "浙江", "浙江": "浙江",
      "安徽省": "安徽", "安徽": "安徽",
      "福建省": "福建", "福建": "福建",
      "江西省": "江西", "江西": "江西",
      "山东省": "山东", "山东": "山东",
      "河南省": "河南", "河南": "河南",
      "湖北省": "湖北", "湖北": "湖北",
      "湖南省": "湖南", "湖南": "湖南",
      "广东省": "广东", "广东": "广东",
      "海南省": "海南", "海南": "海南",
      "四川省": "四川", "四川": "四川",
      "贵州省": "贵州", "贵州": "贵州",
      "云南省": "云南", "云南": "云南",
      "陕西省": "陕西", "陕西": "陕西",
      "甘肃省": "甘肃", "甘肃": "甘肃",
      "青海省": "青海", "青海": "青海",
      "台湾省": "台湾", "台湾": "台湾",
      "内蒙古自治区": "内蒙古", "内蒙古": "内蒙古",
      "广西壮族自治区": "广西", "广西": "广西",
      "西藏自治区": "西藏", "西藏": "西藏",
      "宁夏回族自治区": "宁夏", "宁夏": "宁夏",
      "新疆维吾尔自治区": "新疆", "新疆": "新疆",
      "香港特别行政区": "香港", "香港": "香港",
      "澳门特别行政区": "澳门", "澳门": "澳门"
    };
    return map[raw] || raw;
  }

  async function detectProvince() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const response = await fetch("https://ipapi.co/json/", { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeoutId);
      if (!response.ok) return "未知";
      const data = await response.json();
      return normalizeProvince(data.region || data.region_code || data.country_name);
    } catch {
      return "未知";
    }
  }

  function updateOfflineStats(province) {
    const now = Date.now();
    const day = dayKey(now);
    const visitorId = getVisitorId();
    const provinceName = normalizeProvince(province);
    const stats = readStorage(OFFLINE_KEY, {
      total: 0,
      days: {},
      provinces: {},
      visitors: {},
      recent: []
    });

    stats.total += 1;
    if (!stats.days[day]) stats.days[day] = { total: 0, unique: 0 };
    stats.days[day].total += 1;

    const uniqueTag = `${day}|${visitorId}`;
    if (!stats.visitors[uniqueTag]) {
      stats.visitors[uniqueTag] = 1;
      stats.days[day].unique += 1;
    }

    stats.provinces[provinceName] = (stats.provinces[provinceName] || 0) + 1;
    stats.recent.unshift({
      ts: now,
      province: provinceName,
      path: visit.path,
      hash: visitorId.slice(-8)
    });
    stats.recent = stats.recent.slice(0, 20);

    writeStorage(OFFLINE_KEY, stats);
  }

  function buildGetUrl(payload) {
    const params = new URLSearchParams({
      path: payload.path,
      title: payload.title,
      referrer: payload.referrer,
      province: payload.province || "未知",
      ts: String(Date.now())
    });
    return `${endpoint}?${params.toString()}`;
  }

  async function sendPayload(payload) {
    const url = buildGetUrl(payload);
    try {
      await fetch(url, {
        method: "GET",
        mode: "no-cors",
        keepalive: true,
        credentials: "omit"
      });
      return true;
    } catch {
      try {
        const img = new Image();
        img.src = url;
      } catch {
        // ignore
      }
      return false;
    }
  }

  function queuePayload(payload) {
    const queue = readStorage(QUEUE_KEY, []);
    queue.push(payload);
    writeStorage(QUEUE_KEY, queue.slice(-100));
  }

  async function flushQueue() {
    const queue = readStorage(QUEUE_KEY, []);
    if (!queue.length) return;
    const remain = [];
    for (const item of queue) {
      // no-cors cannot read response status; network rejection still indicates failure.
      const ok = await sendPayload(item);
      if (!ok) remain.push(item);
    }
    writeStorage(QUEUE_KEY, remain);
  }

  async function run() {
    const province = await detectProvince();
    updateOfflineStats(province);

    const payload = {
      path: visit.path,
      title: visit.title,
      referrer: visit.referrer,
      province
    };
    const ok = await sendPayload(payload);
    if (!ok) queuePayload(payload);
    await flushQueue();
  }

  run();
})();
