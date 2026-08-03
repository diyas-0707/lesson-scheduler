const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:lesson-scheduler@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { subscription, title, body } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: 'Missing subscription' });
    return;
  }
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: title || 'Lesson Scheduler', body: body || '' })
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    // A 410/404 here usually just means that subscription is stale
    // (user revoked permission, cleared data, etc.) — not worth surfacing
    // as a hard failure to the person who triggered the action.
    res.status(200).json({ ok: false, error: err.message });
  }
};
