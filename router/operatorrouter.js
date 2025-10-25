import express from "express";
import { isloggedIn } from "../utils/authmiddleware.js";
import Operator from "../models/operatormodel.js";

const router = express.Router();

// Add Operator GET
router.get("/add", isloggedIn, async (req, res) => {
  const operators = await Operator.find();
  const operator = {};
  res.render("operators", { error: "", operators, message: "", operator });
});

// Add Operator POST
router.post("/add", isloggedIn, async (req, res) => {
  const { name, code } = req.body;
  const operator = {};

  if (!name && !code)
    return res.render("operators", {
      operators,
      message: "All fields are required",
      operator,
    });

  const isexists = await Operator.findOne({ code: code });

  if (!isexists) {
    await Operator.create({
      name,
      code,
    });
    const operators = await Operator.find();
    res.render("operators", {
      error: "",
      operators,
      message: "Operator added successfully!",
      operator,
    });
  } else {
    const operators = await Operator.find();
    res.render("operators", {
      error: "Operator already exists or invalid!",
      operators,
      message: "",
      operator,
    });
  }
});

// Add Operator EDIT
router.get("/edit/:id", isloggedIn, async (req, res) => {
  const operator = await Operator.findOne({ _id: req.params.id });
  res.render("editoperator", {
    providertype: ["Prepaid", "DTH"],
    error: "",
    message: "",
    operator,
  });
});

// Add Operator EDIT
router.post("/edit/:id", isloggedIn, async (req, res) => {
  let { name, code, providertype } = req.body;
  const operator = await Operator.findOne({ _id: req.params.id });
  providertype = providertype.toUpperCase()

  if (!name && !code)
    return res.render("editoperator", {
      providertype: ["Prepaid", "DTH"],
      error: "All fields are required",
      message: "",
      operator,
    });
  await Operator.findByIdAndUpdate(
    { _id: req.params.id },
    {
      name,
      code,
      providertype,
    }
  );
  res.redirect("/operator/add");
});

// Add Operator DELETE
router.post("/delete/:id", async (req, res) => {
  await Operator.findByIdAndDelete({ _id: req.params.id });
  res.redirect("/operator/add");
});

export { router as operatorroute };