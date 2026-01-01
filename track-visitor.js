/**
 * Visitor Analytics — Production Ready
 * GDPR Safe • Supabase Logging • Netlify Free Tier Compatible
 */

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 200, headers, body: "" };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ status: false, error: "Use POST" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const {
      page,
      referrer = null,
      userAgent = "",
      sessionId = null,
      event: eventType = "pageview",
    } = body;

    if (!page) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: false,
          error: "page required",
        }),
      };
    }

    // ---- Privacy-Safe Visitor Metadata ----
    const visitor = extractVisitor(event, userAgent);

    // ---- Supabase Insert ----
    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error } = await supabase.from("analytics_events").insert([
      {
        event_type: eventType,
        page_path: page,
        referrer,
        session_id: sessionId,
        country: visitor.country,
        browser: visitor.browser,
        device_type: visitor.deviceType,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Analytics Insert Error:", error.message);
    }

    console.log("Visitor Tracked:", page, visitor.country);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: true, tracked: true }),
    };
  } catch (err) {
    console.error("Analytics Failure:", err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: true,
        tracked: false,
        message: "analytics unavailable",
      }),
    };
  }
};

// -------- Privacy Safe Extraction --------
function extractVisitor(event, userAgentRaw) {
  const ua = (userAgentRaw || event.headers["user-agent"] || "").toLowerCase();
  const deviceType = ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")
    ? "mobile"
    : ua.includes("tablet") || ua.includes("ipad")
    ? "tablet"
    : "desktop";

  const browser =
    ua.includes("firefox")
      ? "Firefox"
      : ua.includes("chrome") && !ua.includes("edge")
      ? "Chrome"
      : ua.includes("safari") && !ua.includes("chrome")
      ? "Safari"
      : ua.includes("edge")
      ? "Edge"
      : ua.includes("opera") || ua.includes("opr")
      ? "Opera"
      : "Other";

  let country = "unknown";

  // Netlify Geo
  if (event.headers["x-country"]) country = event.headers["x-country"];

  // Newer Netlify Geo JSON header
  if (event.headers["x-nf-geo"]) {
    try {
      const geo = JSON.parse(event.headers["x-nf-geo"]);
      if (geo?.country?.code) country = geo.country.code;
    } catch {}
  }

  return { deviceType, browser, country };
}
