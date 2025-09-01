// admin/server/routes/admin.js
const express = require('express');
const { z } = require('zod');
const { supabase, supabaseAdmin } = require('./config/supabaseClient');

const router = express.Router();

// Example: list pending lawyer applications
router.get('/applications', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lawyer_applications')
      .select('*')
      .eq('status', 'pending')
      .limit(50);

    if (error) throw error;
    res.json({ items: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve an application (requires service role key)
const ApproveSchema = z.object({ id: z.string().min(1) });
router.post('/applications/approve', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Service role key not configured' });
    }

    const parsed = ApproveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.issues });
    }

    const { id } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from('lawyer_applications')
      .update({ status: 'approved' })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ item: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
