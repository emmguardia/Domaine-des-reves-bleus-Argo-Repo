import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI manquant dans les variables d\'environnement');
    }
    console.log('Tentative de connexion à MongoDB...');
    console.log('URL de connexion:', MONGODB_URI.replace(/:\/\/[\w-]+:(.*?)@/, '://<user>:<hidden>@'));
    
    const conn = await mongoose.connect(MONGODB_URI);
    
    console.log('✅ MongoDB connecté avec succès!');
    console.log(`📊 Base de données: ${conn.connection.name}`);
    console.log(`🔌 Hôte: ${conn.connection.host}`);
    console.log(`🔑 Port: ${conn.connection.port}`);
    
    mongoose.connection.on('connected', () => {
      console.log('🟢 MongoDB connecté');
    });

    mongoose.connection.on('error', (err) => {
      console.error('🔴 Erreur de connexion MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🟡 MongoDB déconnecté');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB déconnecté suite à l\'arrêt de l\'application');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error.message);
    console.error('Détails de l\'erreur:', error);
    process.exit(1);
  }
};

export default connectDB; 