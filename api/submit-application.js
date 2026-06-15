import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, email, role, linkedin, message } = req.body;

    if (!name || !email || !role || !linkedin || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // ---- SUPABASE SAVE ----
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    // Note: This assumes a 'career_submissions' table exists.
    // Recommended columns: name (text), email (text), role (text), linkedin (text), message (text), created_at (timestamp)
    const { error: supabaseError } = await supabase.from('career_submissions').insert([
      { name, email, role, linkedin, message }
    ]);

    if (supabaseError) {
      console.warn('Supabase Insert Error:', supabaseError);
      // We continue to email even if DB insert fails to ensure we don't lose the application
    }

    // ---- EMAIL ALERT ----
    const resend = new Resend(process.env.RESEND_API_KEY_1);

    await resend.emails.send({
      from: 'LinguaWaves Careers <hello@linguawaves.com>',
      to: 'linguawave.a@gmail.com',
      subject: `💼 New Application: ${name} (${role})`,
      html: `
        <h2>New Career Application</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Role of Interest:</b> ${role}</p>
        <p><b>LinkedIn/Portfolio:</b> <a href="${linkedin}">${linkedin}</a></p>
        <p><b>Message:</b> ${message}</p>
        <br>
        <hr>
        <p><small>Sent via Linguawaves Careers Portal</small></p>
      `
    });

    return res.status(200).json({ success: true, message: 'Application submitted successfully' });

  } catch (err) {
    console.error('Application Submission Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
