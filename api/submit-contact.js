/**
 * Contact Submission → Supabase Storage
 * Secure • Netlify Free Tier Compatible • Production Ready
 */

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // later: replace with your domain
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
    const { name, email, message, company = null, phone = null } = body;

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: false,
          error: "name, email and message are required",
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

    // ---- Supabase (secure server key) ----
    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error } = await supabase.from("contacts").insert([
      {
        name,
        email,
        message,
        company,
        phone,
        created_at: new Date().toISOString(),
      },
    ]);

    // Handles duplicate email constraint safely
    if (error) {
      console.error("Supabase Insert Error:", error.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: false,
          error:
            error.code === "23505"
              ? "Contact already exists. We'll be in touch."
              : "Failed to save submission",
        }),
      };
    }

    console.log("Contact stored:", email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: true,
        message: "Contact stored successfully",
        data: { name, email, submittedAt: new Date().toISOString() },
      }),
    };
  } catch (err) {
    console.error("Submit Contact Fatal:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: false,
        error: "Internal server error",
      }),
    };
  }
};
