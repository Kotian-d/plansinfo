// models/Operator.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const OperatorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    providertype: {
      type: String,
      enum: ["PREPAID", "DTH"],
      default: "PREPAID",
    },
  },
  {
    timestamps: true,
  }
);

const Operator = model("Operator", OperatorSchema);

export default Operator;
