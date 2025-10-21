import express from "express";
import User from "../models/users.js";
import Operator from "../models/operatormodel.js";
import DthPlans from "../models/dthplans.js";
import PlanModel from "../models/prepaidplan.js";
import { clients, reconnectClient } from "../utils/WASocket.js";
import WhatsappSession from "../models/WhatsappSession.js";

const router = express.Router();

async function isValidKey(req, res, next) {
  const apikey = req.query.apikey;
  const isValid = await User.findOne({ apikey });
  if (!isValid)
    return res
      .json({ status: "error", message: "Unauthorized User" })
      .status(401);
  next();
}

router.get("/prepaidplans", isValidKey, async (req, res) => {
  const opcode = req.query.operator;
  const operatorDoc = await Operator.findOne({ code: opcode });
  if (!operatorDoc) {
    return res.json({
      status: "error",
      message: "Invalid operator code",
    });
  }

  const results = await PlanModel.aggregate([
    // 1. Lookup operator details
    {
      $lookup: {
        from: "operators",
        localField: "operator",
        foreignField: "_id",
        as: "operator",
      },
    },
    { $unwind: "$operator" },

    // 2. Filter by operator before expanding tags
    { $match: { "operator._id": operatorDoc._id } },

    // 3. Lookup associated tags
    {
      $lookup: {
        from: "tags",
        localField: "tags",
        foreignField: "_id",
        as: "tags",
      },
    },
    { $unwind: "$tags" },

    // 4. Group by tag name, collect plan objects
    {
      $group: {
        _id: "$tags.name",
        plans: {
          $push: {
            title: "$title",
            description: "$description",
            amount: "$amount",
            validity: "$validity",
            updatedAt: "$updatedAt",
          },
        },
      },
    },

    // 5. Format projection
    {
      $project: {
        _id: 0,
        tag: "$_id",
        plans: 1,
      },
    },
  ]);

  res.json({
    status: "success",
    result: results,
  });
});

router.get("/dthplans", isValidKey, async (req, res) => {
  const opcode = req.query.operator;
  const operatorDoc = await Operator.findOne({ code: opcode });
  if (!operatorDoc) {
    return res.json({
      status: "error",
      message: "Invalid operator code",
    });
  }

  const dthPlans = await DthPlans.find(
    { operator: operatorDoc._id },
    {
      _id: 0,
      "1month": "$amount1month",
      "3month": "$amount3month",
      "6month": "$amount6month",
      "12month": "$amount12month",
    }
  )
    .select("title description updatedAt -operator -__v -createdAt")
    .exec();
  res.json({
    status: "success",
    result: dthPlans,
  });
});

router.get("/send-message", async (req, res) => {
  try {
    const { phone, message, session, apikey } = req.query;
    const isValid = await User.findOne({ apikey });
    if (!isValid)
      return res
        .json({ status: "error", message: "Unauthorized User" })
        .status(401);

    if(!phone || !message || !session) {
      return  res.status(400).json({ error: "Missing required parameters" });
    }

    const sessionExists = await WhatsappSession.findOne({ id: session });

    if (!sessionExists) {
      return res.status(400).json({ error: "Invalid session" });
    }

    if(sessionExists.status !== "connected") {
      return res.status(400).json({ error: "WhatsApp session not connected, please start the session" });
    }

    const sock = clients.get(parseInt(session));
    if (!sock) {
      try {
        await reconnectClient(parseInt(session)); // Will throw if reconnect failed
        sock = clients.get(parseInt(session));
        if (!sock) throw new Error("Relogin required");
      } catch (err) {
        return res
          .status(400)
          .json({ error: "WhatsApp not connected: " + err.message });
      }
    }
    const sanitized_number = phone.toString().replace(/[- )(]/g, ""); // remove unnecessary chars from the number
    const final_number = `91${sanitized_number.substring(
      sanitized_number.length - 10
    )}`; // add 91 before the number here 91 is country code of India

    const jid = final_number.includes("@s.whatsapp.net")
      ? final_number
      : `${final_number}@s.whatsapp.net`;

    // Check if number exists on WhatsApp
    const [exists] = await sock?.onWhatsApp(final_number);
    if (!exists || !exists.exists) {
      return res.status(400).json({ error: "Number is not on WhatsApp" });
    }

    await sock.sendMessage(jid, { text: message });
    res.json({ status: "Message sent", session: session, to: final_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as apiroute };
