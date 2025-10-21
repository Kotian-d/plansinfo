import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'
import mongoose from 'mongoose'

// Define schema for Baileys auth state document
const authStateSchema = new mongoose.Schema({
  sessionKey: { type: String, unique: true, required: true },
  creds: { type: String, default: '' }, // JSON stringified
  keys: { type: String, default: '{}' }, // JSON stringified
})

export const AuthStateModel = mongoose.model('AuthState', authStateSchema)

export async function useMongooseAuthState(mongoUri, sessionKey = 'defaultSession') {
  // Connect to MongoDB if not connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
  }

  // Find or create auth state doc
  let authStateDoc = await AuthStateModel.findOne({ sessionKey })
  if (!authStateDoc) {
    authStateDoc = new AuthStateModel({ sessionKey })
    await authStateDoc.save()
  }

  // Load creds and keys from doc or initialize
  let creds = authStateDoc.creds ? JSON.parse(authStateDoc.creds, BufferJSON.reviver) : initAuthCreds()
  let keys = authStateDoc.keys ? JSON.parse(authStateDoc.keys, BufferJSON.reviver) : {}

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        const data = {}
        if (keys[type]) {
          for (const id of ids) {
            if (keys[type][id]) {
              data[id] = keys[type][id]
            }
          }
        }
        return data
      },
      set: async (data) => {
        for (const category in data) {
          if (!keys[category]) keys[category] = {}
          Object.assign(keys[category], data[category])
        }
        authStateDoc.keys = JSON.stringify(keys, BufferJSON.replacer)
        await authStateDoc.save()
      }
    }
  }

  const saveCreds = async () => {
    authStateDoc.creds = JSON.stringify(state.creds, BufferJSON.replacer)
    await authStateDoc.save()
  }

  return { state, saveCreds }
}