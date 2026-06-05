export async function trackPageVisit(path?: string): Promise<void> {
  try {
    await fetch("https://randompicks.es/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: path ?? window.location.pathname }),
    });
  } catch {
    // silencioso — no rompe la experiencia del usuario
  }
}
