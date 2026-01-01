export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      return res.status(200).json({ message: "Preflight OK" });
    }

    const data = req.body;

    console.log("Received Data:", data);

    return res.status(200).json({
      success: true,
      message: "Form submitted successfully!"
    });

  } catch (error) {
    console.error("Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
}
