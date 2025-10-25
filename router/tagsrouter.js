import express from "express";
import { isloggedIn } from "../utils/authmiddleware.js";
import Tag from "../models/tagsmodel.js";

const router = express.Router();

// Add Tags GET
router.get("/add", isloggedIn, async (req, res) => {
  const tags = await Tag.find({});
  res.render("tagspage", { tags, error: "", message: "" });
});

// Add Tags POST
router.post("/add", isloggedIn, async (req, res) => {
  const { name } = req.body;
  const isexists = await Tag.findOne({ name: name });
  if (!isexists) {
    await Tag.create({ name });
    const tags = await Tag.find({});
    res.render("tagspage", {
      tags,
      error: "",
      message: "Tag added successfully!",
    });
  } else {
    const tags = await Tag.find({});
    res.render("tagspage", {
      tags,
      error: "Tag already exists or invalid!",
      message: "",
    });
  }
});

// Edit Tags GET
router.get("/edit/:id", isloggedIn, async (req, res) => {
  const tags = await Tag.findById(req.params.id);
  res.render("edittagspage", { tags, error: "", message: "" });
});

// Edit Tags POST
router.post("/edit/:id", isloggedIn, async (req, res) => {
  const { name } = req.body;
  const isexists = await Tag.findOne({ name: name });
  if (!isexists) {
    await Tag.findByIdAndUpdate(req.params.id, { name });
    const tags = await Tag.find({});
    res.render("tagspage", {
      tags,
      error: "",
      message: "Tag updated successfully!",
    });
  } else {
    const tags = await Tag.find({});
    res.render("tagspage", {
      tags,
      error: "Tag already exists or invalid!",
      message: "",
    });
  }
});

// Delete Tags POST
router.post("/delete/:id", isloggedIn, async (req, res) => {
  const isexists = await Tag.findOne({ _id: req.params.id });
  if (isexists) {
    await Tag.findByIdAndDelete(req.params.id);
    const tags = await Tag.find({});
    res.render("tagspage", {
      tags,
      error: "",
      message: "Tag Deleted successfully!",
    });
  } else {
    const tags = await Tag.find({});
    res.render("tagspage", {
      tags,
      error: "Tag Doesnot exists or invalid!",
      message: "",
    });
  }
});

export { router as tagsrouter };