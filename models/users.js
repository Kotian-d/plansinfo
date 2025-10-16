// models/User.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  apikey: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

const User = model('User', UserSchema);

export default User;
