import express from "express";
import multer from "multer";
import DthPlans from "../models/dthplans.js";
import { isloggedIn } from "../utils/authmiddleware.js";
import Operator from "../models/operatormodel.js";
import csv from "csv-parser";
import stream from "stream";

const router = express.Router();

// Use in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", isloggedIn, async (req, res) => {
  const entries = await DthPlans.find({}).populate("operator");

  const perPage = 10; // Entries per page
  const page = parseInt(req.query.page) || 1;

  // Assume entriesArray is your array of all entries
  const totalEntries = entries.length;
  const totalPages = Math.ceil(totalEntries / perPage);

  // Slice the entries for the current page
  const paginatedEntries = entries.slice((page - 1) * perPage, page * perPage);

  const operators = await Operator.find({ providertype: "DTH" });

  res.render("dthplans", {
    error: "",
    message: "",
    entries: paginatedEntries,
    currentPage: page,
    totalPages: totalPages,
    operators: operators,
  }); // Renders views/index.ejs and passes data
});

router.post("/add", async (req, res) => {
  const {
    title,
    description,
    operator,
    amount1month,
    amount3month,
    amount6month,
    amount12month,
    tags,
  } = req.body;

  await DthPlans.create({
    title,
    description,
    operator,
    amount1month,
    amount3month,
    amount6month,
    amount12month,
    tags,
  });

  const entries = await DthPlans.find({}).populate("operator");

  // If CSV uploaded, parse it and save to DB (csv parsing required here)
  // If form submitted normally, save individual entry
  const perPage = 5; // Entries per page
  const page = parseInt(req.query.page) || 1;

  // Assume entriesArray is your array of all entries
  const totalEntries = entries.length;
  const totalPages = Math.ceil(totalEntries / perPage);

  // Slice the entries for the current page
  const paginatedEntries = entries.slice((page - 1) * perPage, page * perPage);

  const operators = await Operator.find({ providertype: "DTH" });

  res.render("dthplans", {
    error: "",
    message: "Entry added successfully!",
    entries: paginatedEntries,
    currentPage: page,
    totalPages: totalPages,
    operators,
  });
});

router.post("/uploadcsv", isloggedIn, upload.single("csvfile"), async (req, res) => {
  try {
  
    const entries = await DthPlans.find({});

    // If CSV uploaded, parse it and save to DB (csv parsing required here)
    // If form submitted normally, save individual entry
    const perPage = 5; // Entries per page
    const page = parseInt(req.query.page) || 1;

    // Assume entriesArray is your array of all entries
    const totalEntries = entries.length;
    const totalPages = Math.ceil(totalEntries / perPage);

    // Slice the entries for the current page
    const paginatedEntries = entries.slice(
      (page - 1) * perPage,
      page * perPage
    );

    const csvBuffer = req.file.buffer;

    // using csv-parse
    const results = [];
    let operatorMap = [];

    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    // Parse CSV synchronously, then process each row with async/await
    const parsedRows = [];
    const operatorsMap = {};
    const operatorArray = await Operator.find({});
    operatorArray.forEach((op) => {
      operatorsMap[op.code] = op._id;
    });
    await new Promise((resolve, reject) => {
      bufferStream
        .pipe(
          csv({
            skipLines: 1,
            headers: [
              "title",
              "description",
              "operator",
              "amount1month",
              "amount3month",
              "amount6month",
              "amount12month",
              "tags",
            ],
          })
        )
        .on("data", (data) => {
          parsedRows.push(data);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Now process each row with async/await
    for (const data of parsedRows) {  
      if (!data.operator || !operatorsMap[data.operator]) {
        throw new Error(`No operator found for code: ${data.operator}`);
      }
      // Optionally, map operator code to _id if needed
      data.operator = operatorsMap[data.operator];
      results.push(data);
    }

    await DthPlans.insertMany(results);

    const operators = await Operator.find({ providertype: "DTH" });

    res.render("dthplans", {
      error: "",
      message: "Entry imported successfully!",
      entries: paginatedEntries,
      currentPage: page,
      totalPages: totalPages,
      operators,
    });
  } catch (error) {
    req.flash("error", "Error processing CSV file: " + error.message);
    res.redirect("/dthplans");
  }
});

router.get("/edit/:id", isloggedIn, async (req, res) => {
  try {
    const editdata = await DthPlans.findById({ _id: req.params.id }).populate("operator");

    const entries = await DthPlans.find({}).populate("operator");

    // If CSV uploaded, parse it and save to DB (csv parsing required here)
    // If form submitted normally, save individual entry
    const perPage = 5; // Entries per page
    const page = parseInt(req.query.page) || 1;

    // Assume entriesArray is your array of all entries
    const totalEntries = entries.length;
    const totalPages = Math.ceil(totalEntries / perPage);

    // Slice the entries for the current page
    const paginatedEntries = entries.slice(
      (page - 1) * perPage,
      page * perPage
    );

    const operators = await Operator.find({ providertype: "DTH" });

    res.render("editdthplans", {
      editdata,
      operators,
    });
  } catch (error) {
   res.redirect("/dthplans");
  }
});

router.post("/edit/:id", isloggedIn, async (req, res) => {
  try {
    const {
      title,
      description,
      operator,
      amount1month,
      amount3month,
      amount6month,
      amount12month,
      tags,
    } = req.body;

    await DthPlans.findByIdAndUpdate(
      { _id: req.params.id },
      {
        title,
        description,
        operator,
        amount1month,
        amount3month,
        amount6month,
        amount12month,
        tags,
      }
    );

    req.flash("success", "Entry updated successfully.");
    res.redirect("/dthplans");
  } catch (error) {
    res.redirect("/dthplans");
  }
});

router.post("/delete/:id", isloggedIn, async (req, res) => {
  try {
    await DthPlans.findByIdAndDelete({ _id: req.params.id });

    const entries = await DthPlans.find({});

    // If CSV uploaded, parse it and save to DB (csv parsing required here)
    // If form submitted normally, save individual entry
    const perPage = 5; // Entries per page
    const page = parseInt(req.query.page) || 1;

    // Assume entriesArray is your array of all entries
    const totalEntries = entries.length;
    const totalPages = Math.ceil(totalEntries / perPage);

    // Slice the entries for the current page
    const paginatedEntries = entries.slice(
      (page - 1) * perPage,
      page * perPage
    );

    const operators = await Operator.find({ providertype: "DTH" });

    res.render("dthplans", {
      error: "",
      message: "Entry deleted successfully!",
      entries: paginatedEntries,
      currentPage: page,
      totalPages: totalPages,
      operators,
    });
  } catch (error) {
    const operators = await Operator.find({ providertype: "DTH" });
    res.render("editdthplans", {
      error: "Something Went Wrong!",
      message: "",
      operators,
    });
  }
});

router.get("/search", isloggedIn, async (req, res) => {
  try {
    const q = req.query.q || "";
    const regex = new RegExp(q, "i"); // case-insensitive regex

    // Build query to search across title, description, operator, amount fields (converted to string)
    const query = {
      $or: [
        { title: regex },
        { description: regex },
        { "operator.name": regex },
        { amount1month: isNaN(Number(q)) ? undefined : Number(q) },
        { amount3month: isNaN(Number(q)) ? undefined : Number(q) },
        { amount6month: isNaN(Number(q)) ? undefined : Number(q) },
        { amount12month: isNaN(Number(q)) ? undefined : Number(q) },
      ].filter((cond) => cond !== undefined), // filter out undefined to avoid matching on amount fields if q is not number
    };

    const results = await DthPlans.find(query).populate('operator').exec();
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

export { router as dthplansroute };
