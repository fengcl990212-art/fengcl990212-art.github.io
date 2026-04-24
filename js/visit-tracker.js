(function () {
  const endpoint = "/api/visit";
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
