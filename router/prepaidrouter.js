import express from "express";
import multer from "multer";
import PlanModel from "../models/prepaidplan.js";
import { isloggedIn } from "../utils/authmiddleware.js";
import Operator from "../models/operatormodel.js";
import csv from "csv-parser";
import stream from "stream";
import Tag from "../models/tagsmodel.js";

const router = express.Router();

// Use in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", isloggedIn, async (req, res) => {
  const entries = await PlanModel.find({}).populate(["tags", "operator"]);

  const perPage = 10; // Entries per page
  const page = parseInt(req.query.page) || 1;

  // Assume entriesArray is your array of all entries
  const totalEntries = entries.length;
  const totalPages = Math.ceil(totalEntries / perPage);

  // Slice the entries for the current page
  const paginatedEntries = entries.slice((page - 1) * perPage, page * perPage);

  const operators = await Operator.find({providertype: "PREPAID"});
  const tagsList = await Tag.find({});

  res.render("prepaidplans", {
    error: "",
    message: "",
    entries: paginatedEntries,
    currentPage: page,
    totalPages: totalPages,
    operators: operators,
    tagsList,
  }); // Renders views/index.ejs and passes data
});

router.post("/add", isloggedIn, async (req, res) => {
  const { title, description, operator, validity, amount, tags } = req.body;

  await PlanModel.create({
    title,
    description,
    operator,
    validity,
    amount,
    tags,
  });

  const entries = await PlanModel.find({});

  // If CSV uploaded, parse it and save to DB (csv parsing required here)
  // If form submitted normally, save individual entry
  const perPage = 5; // Entries per page
  const page = parseInt(req.query.page) || 1;

  // Assume entriesArray is your array of all entries
  const totalEntries = entries.length;
  const totalPages = Math.ceil(totalEntries / perPage);

  // Slice the entries for the current page
  const paginatedEntries = entries.slice((page - 1) * perPage, page * perPage);

  const operators = await Operator.find({providertype: "PREPAID"});
  const tagsList = await Tag.find({});

  res.render("prepaidplans", {
    error: "",
    message: "Entry added successfully!",
    entries: paginatedEntries,
    currentPage: page,
    totalPages: totalPages,
    operators,
    tagsList,
  });
});

router.post("/uploadcsv", isloggedIn, upload.single("csvfile"), async (req, res) => {
  /*
  await DthPlans.create({
    title,
    description,
    operator,
    amount1month,
    amount3month,
    amount6month,
    amount12month,
    tags,
  });*/

  const entries = await PlanModel.find({});

  // If CSV uploaded, parse it and save to DB (csv parsing required here)
  // If form submitted normally, save individual entry
  const perPage = 5; // Entries per page
  const page = parseInt(req.query.page) || 1;

  // Assume entriesArray is your array of all entries
  const totalEntries = entries.length;
  const totalPages = Math.ceil(totalEntries / perPage);

  // Slice the entries for the current page
  const paginatedEntries = entries.slice((page - 1) * perPage, page * perPage);

  const csvBuffer = req.file.buffer;

  // using csv-parse
  const results = [];

  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);

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
      console.log(data);

      results.push(data);
    })
    .on("end", () => {
      //console.log({ parsed: results });
    })
    .on("error", (err) => {
      res.status(500).send("Error parsing CSV");
    });

  await PlanModel.insertMany(results);

  const operators = await Operator.find({});

  res.render("dthplans", {
    error: "",
    message: "Entry imported successfully!",
    entries: paginatedEntries,
    currentPage: page,
    totalPages: totalPages,
    operators,
  });
});

router.get("/edit/:id", isloggedIn, async (req, res) => {
  try {
    const editdata = await PlanModel.findById({ _id: req.params.id });
    const operators = await Operator.find({providertype: "PREPAID"});
    const tagsList = await Tag.find({});

    res.render("editprepaidplans", {
      id: req.params.id,
      editdata,
      error: "",
      message: "Entry edited successfully!",
      operators,
      tagsList
    });
    

  } catch (error) {
    const operators = await Operator.find({providertype: "PREPAID"});
    res.render("editdthplans", {
      id: req.params.id,
      editdata: "",
      error: "Something Went Wrong!",
      message: "",
      operators,
    });
  }
});

router.post("/edit/:id", isloggedIn, async (req, res) => {
  try {
    const { title, description, operator, amount, validity, tags } = req.body;

    await PlanModel.findByIdAndUpdate(
      { _id: req.params.id },
      {
        title,
        description,
        operator,
        amount,
        validity,
        tags,
      }
    );

    const entries = await PlanModel.find({});

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

    const operators = await Operator.find({providertype: "PREPAID"});
    const tagsList = await Tag.find({});    

    res.render("prepaidplans", {
      error: "",
      message: "Entry edited successfully!",
      entries: paginatedEntries,
      currentPage: page,
      totalPages: totalPages,
      operators,
      tagsList
    });
  } catch (error) {

    const operators = await Operator.find({providertype: "PREPAID"});
    res.render("editprepaidplans", {
      error: "Something Went Wrong!",
      message: "",
      operators,
    });
  }
});

router.post("/delete/:id", isloggedIn, async (req, res) => {
  try {
    await PlanModel.findByIdAndDelete({ _id: req.params.id });

    const entries = await PlanModel.find({});

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

    res.redirect("/prepaidplans");
  } catch (error) {
    res.redirect("/prepaidplans");
  }
});

router.get('/search', isloggedIn, async (req, res) => {
  try {
    const searchTerm = req.query.q || '';
    const regex = new RegExp(searchTerm, 'i'); // case-insensitive regex

    // Query across multiple fields: title, description, operator.name, tags.name, etc.
    const results = await PlanModel.find({
      $or: [
        { title: regex },
        { description: regex },
        { validity: regex },
        { 'operator.name': regex },
        { amount: isNaN(Number(searchTerm)) ? undefined : Number(searchTerm) },
        { 'tags.name': regex }
      ]
    }).populate('operator').populate('tags').exec();

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

export { router as prepaidplansroute };
