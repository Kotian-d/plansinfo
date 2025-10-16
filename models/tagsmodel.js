import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true // Optional: to avoid duplicate tag names
  }
}, {
  timestamps: true // optional: adds createdAt and updatedAt
});

const Tag = mongoose.model('Tag', tagSchema);

export default Tag;
