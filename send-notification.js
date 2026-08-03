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
    // A 410/404 here means that subscription is stale (user revoked
    // permission, cleared data, uninstalled, etc.) — flag it so the client
    // can remove that device's record instead of retrying it forever.
    const gone = err.statusCode === 404 || err.statusCode === 410;
    res.status(200).json({ ok: false, gone, error: err.message });
  }
};