/**
 * HubSpot Sync — Production Ready
 * Secure | Netlify Friendly | Works with Supabase Free Tier
 */

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    const { email, firstname } = body;

    if (!email || !firstname) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: false,
          error: "email & firstname are required",
        }),
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ status: false, error: "Invalid email" }),
      };
    }

    const token = process.env.HUBSPOT_PRIVATE_TOKEN;
    if (!token) throw new Error("Missing HUBSPOT_PRIVATE_TOKEN");

    const hubspotPayload = {
      properties: {
        email,
        firstname,
        lastname: body.lastname || "",
        company: body.company || "",
        phone: body.phone || "",
        website: body.website || "",
        message: body.message || "",
        hs_lead_source: "Website - Linguawaves",
      },
    };

    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(hubspotPayload),
      }
    );

    const result = await response.json();

    // ---------- Handle HubSpot Errors ----------
    if (!response.ok) {
      console.error("HubSpot Error:", result);

      // Duplicate Contact
      if (response.status === 409) {
        await logToSupabase(email, "duplicate", null, result.message);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: true,
            message: "Contact already exists in HubSpot",
            email,
          }),
        };
      }

      throw new Error(result.message || "HubSpot sync failed");
    }

    // ---------- Log Success to Supabase ----------
    await logToSupabase(email, "success", result.id, null);

    console.log("HubSpot synced:", email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: true,
        message: "Synced to HubSpot",
        contactId: result.id,
      }),
    };
  } catch (err) {
    console.error("HubSpot Fatal:", err);

    try {
      await logToSupabase(null, "failed", null, err.message);
    } catch (_) {}

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: false,
        error: "HubSpot sync failed",
      }),
    };
  }
};

// ---------- Supabase Sync Log Helper ----------
async function logToSupabase(email, status, contactId, errorMsg) {
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  await supabase.from("hubspot_syncs").insert([
    {
      email,
      hubspot_contact_id: contactId || null,
      sync_status: status,
      error_message: errorMsg || null,
      synced_at: new Date().toISOString(),
    },
  ]);
}
