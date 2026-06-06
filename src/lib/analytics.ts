export async function trackPageVisit(path?: string): Promise<void> {
  const payload = { path: path ?? window.location.pathname };
  console.log("[analytics] enviando visita:", payload);
  try {
    const res = await fetch("https://randompicks.es/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    console.log("[analytics] respuesta:", res.status, res.ok ? "OK" : "ERROR");
  } catch (err) {
    console.error("[analytics] fallo de red:", err);
  }
}
