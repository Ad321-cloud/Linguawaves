import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, email, company, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('contact_submissions')
      .insert([{ name, email, company, message }]);

    if (error) {
      console.error('Supabase Insert Error:', error);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    console.log('Form saved:', data);

    return res.status(200).json({
      success: true,
      message: 'Form submitted and stored successfully!',
    });
  } catch (err) {
    console.error('Server Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

