// models/Entry.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const DthPlansSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    operator: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Operator",
    },
    amount1month: {
      type: Number,
      required: true,
      min: 0,
    },
    amount3month: {
      type: Number,
      required: true,
      min: 0,
    },
    amount6month: {
      type: Number,
      required: true,
      min: 0,
    },
    amount12month: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const DthPlans = model("DthPlans", DthPlansSchema);

export default DthPlans;
