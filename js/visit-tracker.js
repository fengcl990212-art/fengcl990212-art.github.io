(function () {
  const DEFAULT_ANALYTICS_BASE = "https://fengcl-homepage-analytics.fengcl990212.workers.dev";
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

  function buildGetUrl() {
    const params = new URLSearchParams({
      path: visit.path,
      title: visit.title,
      referrer: visit.referrer,
      ts: String(Date.now())
    });
    return `${endpoint}?${params.toString()}`;
  }

  function sendByGet() {
    const url = buildGetUrl();
    fetch(url, {
      method: "GET",
      mode: "no-cors",
      keepalive: true,
      credentials: "omit"
    }).catch(() => {
      // Fallback for stricter environments.
      const img = new Image();
      img.src = url;
    });
  }

  sendByGet();
})();
