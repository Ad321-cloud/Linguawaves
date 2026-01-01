/**
 * Cal.com Webhook — Production Ready
 * Secure Signature Verification + Supabase Logging
 */

export const handler = async (event) => {
  const headers = { "Content-Type": "application/json" };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ status: false, error: "Use POST" }),
    };
  }

  try {
    // ---------- Verify Signature ----------
    const signature = event.headers["x-cal-signature-256"];
    const secret = process.env.CALCOM_WEBHOOK_SECRET;

    if (!secret || !signature) {
      console.error("Missing signing secret or signature");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ status: false, error: "Unauthorized" }),
      };
    }

    const { createHmac } = await import("crypto");
    const expected = createHmac("sha256", secret)
      .update(event.body)
      .digest("hex");

    if (expected !== signature) {
      console.error("Invalid webhook signature");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ status: false, error: "Invalid signature" }),
      };
    }

    // ---------- Parse Payload ----------
    const { triggerEvent, payload } = JSON.parse(event.body);

    console.log("Cal.com Event:", triggerEvent, payload?.id);

    switch (triggerEvent) {
      case "BOOKING_CREATED":
        await bookingCreated(payload);
        break;

      case "BOOKING_RESCHEDULED":
        await bookingRescheduled(payload);
        break;

      case "BOOKING_CANCELLED":
        await bookingCancelled(payload);
        break;

      default:
        console.log("Unhandled event:", triggerEvent);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: true,
        message: "Webhook processed",
        event: triggerEvent,
      }),
    };
  } catch (err) {
    console.error("Cal Webhook Fatal:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: false,
        error: "Webhook processing failed",
      }),
    };
  }
};

// ---------- Helpers ----------
async function supabase() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

async function bookingCreated(data) {
  const attendee = data?.attendees?.[0] || {};
  console.log("Booking Created:", data?.id);

  const db = await supabase();
  await db.from("bookings").insert([
    {
      calcom_booking_id: data.id,
      attendee_name: attendee.name || null,
      attendee_email: attendee.email || null,
      start_time: data.startTime,
      end_time: data.endTime,
      status: "confirmed",
      created_at: new Date().toISOString(),
    },
  ]);
}

async function bookingRescheduled(data) {
  console.log("Booking Rescheduled:", data?.id);

  const db = await supabase();
  await db
    .from("bookings")
    .update({
      start_time: data.startTime,
      end_time: data.endTime,
      updated_at: new Date().toISOString(),
      status: "rescheduled",
    })
    .eq("calcom_booking_id", data.id);
}

async function bookingCancelled(data) {
  console.log("Booking Cancelled:", data?.id);

  const db = await supabase();
  await db
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: data?.cancellationReason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("calcom_booking_id", data.id);
}
