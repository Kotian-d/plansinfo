import mongoose from 'mongoose';

const { Schema } = mongoose;

const planSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  validity: {
    type: String,
    required: true,
    trim: true
  },
  operator: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Operator"
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  tags: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: "Tag"
  }
}, {
  timestamps: true
});

const PlanModel = mongoose.model('Plan', planSchema);

export default PlanModel;
