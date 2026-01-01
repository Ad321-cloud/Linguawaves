import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, email, company, message } = req.body;

    if (!name || !email || !company || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // ---- SUPABASE SAVE ----
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    await supabase.from('contact_submissions').insert([
      { name, email, company, message }
    ]);

    // ---- EMAIL ALERT ----
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'LinguaWaves <hello@linguawaves.com>',
      to: 'linguawave.a@gmail.com',   // <-- CHANGE THIS TO YOUR EMAIL
      subject: '🚀 New Lead From LinguaWaves',
      html: `
        <h2>New Contact Submission</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Company:</b> ${company}</p>
        <p><b>Message:</b> ${message}</p>
      `
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error' });
  }
}


