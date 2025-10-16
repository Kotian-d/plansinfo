import express from "express";
import User from "../models/users.js";
import Operator from "../models/operatormodel.js";
import DthPlans from "../models/dthplans.js";
import PlanModel from "../models/prepaidplan.js";
import Tag from "../models/tagsmodel.js";

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
   { $unwind: "$tags" },
  {
    $group: {
      _id: "$tags.name",
      plans: {
        $push: {
          id: "$_id",
          title: "$title",
          description: "$description",
          amount: "$amount",
          validity: "$validity",
          operator: "$operator.name"
        }
      }
    }
  }
  ]);

  const prepaidPlans = results.reduce((acc, curr) => {
    acc[curr._id] = curr.plans;
    return acc;
  }, {});

  res.json({
    status: "success",
    result: prepaidPlans,
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

  const dthPlans = await DthPlans.find({ operator: operatorDoc._id }, {_id:0})
    .select('title description amount1month amount3month amount6month amount12month updatedAt -operator -__v -createdAt')
    .exec();
  res.json({
    status: "success",
    result: dthPlans,
  });
});

export { router as apiroute };
