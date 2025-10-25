import express from "express";
import User from "../models/users.js";
import bcrypt from "bcrypt";
import { isloggedIn } from "../utils/authmiddleware.js";
import WhatsappSession from "../models/WhatsappSession.js";
import PlanModel from "../models/prepaidplan.js";
import Tag from "../models/tagsmodel.js";
import DthPlans from "../models/dthplans.js";
import Operator from "../models/operatormodel.js";

const router = express.Router();

router.get("/dashboard", isloggedIn, async (req, res) => {
  // Dummy data
  const dthPlans = await DthPlans.countDocuments();
  const prepaidPlans = await PlanModel.countDocuments();
  const operators = await Operator.countDocuments({});
  const tags = await Tag.countDocuments({});
  const activeSessions = await WhatsappSession.countDocuments({
    status: "connected",
  });

  res.render("dashboard", {
    totalDthPlans: dthPlans,
    totalPrepaidPlans: prepaidPlans,
    totalOperators: operators,
    totalTags: tags,
    totalActiveSessions: activeSessions,
    totalLapuCount: dthPlans + prepaidPlans,
  }); // Renders views/index.ejs and passes data
});

router.get("/profile", isloggedIn, async (req, res) => {
  const user = await User.findOne({ _id: req.session.user });
  res.render("profile", {
    error: "",
    message: "",
    title: "Profile",
    user: user,
    avatar: "/images/avatar.png",
  }); // Renders views/index.ejs and passes data
});

router.post("/profile/change-password", isloggedIn, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.find(req.session.user);

  const isvalid = await bcrypt.compare(currentPassword, user.password);

  if (!isvalid)
    return res.render("profile", {
      error: "",
      message: "Invalid Password",
      title: "Profile",
      user,
      avatar: "/images/avatar.png",
    });

  const hashedpassword = await bcrypt.hash(newPassword, 10);

  await User.findByIdAndUpdate(
    { _id: user._id },
    {
      password: hashedpassword,
    }
  );

  res.render("profile", {
    error: "",
    message: "",
    title: "Profile",
    user,
    avatar: "/images/avatar.png",
  }); // Renders views/index.ejs and passes data
});

router.post('/profile/add-ip', async (req, res) => {
  try {
    const { ipAddress } = req.body;
    const userId = req.session.user; // Assuming you have user in session
    
    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:3[0-2]|[12]?[0-9]))?$/;
    
    if (!ipRegex.test(ipAddress)) {
      req.flash('errorMsg', 'Invalid IP address format');
      return res.redirect('/profile');
    }
    
    // Add IP to user's whitelist
    await User.findByIdAndUpdate(userId, {
      $addToSet: { whitelistedIPs: ipAddress } // $addToSet prevents duplicates
    });
    
    req.flash('successMsg', 'IP address added to whitelist successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    req.flash('errorMsg', 'Error adding IP to whitelist');
    res.redirect('/profile');
  }
});

// Remove IP from whitelist
router.post('/profile/remove-ip', async (req, res) => {
  try {
    const { ipAddress } = req.body;
    const userId = req.session.user; // Assuming you have user in session
    
    // Remove IP from user's whitelist
    await User.findByIdAndUpdate(userId, {
      $pull: { whitelistedIPs: ipAddress }
    });
    
    req.flash('successMsg', 'IP address removed from whitelist successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    req.flash('errorMsg', 'Error removing IP from whitelist');
    res.redirect('/profile');
  }
});

export { router as userrouter };
