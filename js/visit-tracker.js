(function () {
  const DEFAULT_ANALYTICS_BASE = "https://fengcl-homepage-analytics.fengcl990212.workers.dev";
  const configuredBase = typeof window !== "undefined" && typeof window.__ANALYTICS_BASE__ === "string"
    ? window.__ANALYTICS_BASE__.trim()
    : "";
  const analyticsBase = (configuredBase || DEFAULT_ANALYTICS_BASE).replace(/\/+$/, "");
  const endpoint = `${analyticsBase}/api/visit`;
  const payload = JSON.stringify({
    path: location.pathname + location.search,
    title: document.title || "",
    referrer: document.referrer || ""
  });

  const send = () => {
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
        return;
      }
    } catch (err) {
      // fall through to fetch
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "omit"
    }).catch(() => {});
  };

  if (document.readyState === "complete") {
    send();
  } else {
    window.addEventListener("load", send, { once: true });
  }
})();
