const ENDPOINT = "https://randompicks.es/panel/api/analytics/visit";
const API_KEY = import.meta.env.PUBLIC_ANALYTICS_KEY as string;

interface VisitPayload {
  path: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  timeOnPageSeconds: number | null;
}

function buildPayload(timeOnPageSeconds: number | null): VisitPayload {
  return {
    path: window.location.pathname,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timeOnPageSeconds,
  };
}

async function sendVisit(timeOnPageSeconds: number | null): Promise<void> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Analytics-Key": API_KEY,
      },
      body: JSON.stringify(buildPayload(timeOnPageSeconds)),
      keepalive: true,
    });
    console.log("[analytics] respuesta:", res.status, res.ok ? "OK" : "ERROR");
  } catch (err) {
    console.error("[analytics] fallo de red:", err);
  }
}

export function trackPageVisit(): void {
  const start = Date.now();

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      const seconds = Math.round((Date.now() - start) / 1000);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          ENDPOINT,
          new Blob([JSON.stringify(buildPayload(seconds))], {
            type: "application/json",
          })
        );
      } else {
        sendVisit(seconds);
      }
    }
  });

  console.log("[analytics] enviando visita inicial");
  sendVisit(null);
}
