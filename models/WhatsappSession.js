import mongoose from 'mongoose';

const WhatsappSessionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'reconnecting', 'error'],
    default: 'disconnected',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
 
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
  collection: 'whatsapp_sessions'
});

export default mongoose.model('WhatsappSession', WhatsappSessionSchema);
