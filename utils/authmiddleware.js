import User from "../models/users.js";

export function isloggedIn(req, res, next) {
  if (req.session && req.session.user) {
    // Session exists, proceed to next middleware/route
    next();
  } else {
    // No valid session, redirect to login page or send error
    res.redirect("/login");
    // Or: res.status(401).send('Unauthorized');
  }
}

export function isNotLoggedIn(req, res, next) {
  if (!req.session && !req.session.user) {
    // Session exists, proceed to next middleware/route
    next();
  } else {
    // No valid session, redirect to login page or send error
    res.redirect("/dashboard");
    // Or: res.status(401).send('Unauthorized');
  }
}

export async function isValidApiKey(req, res, next) {
  const apikey = req.query.apikey;
  const isValid = await User.findOne({ apikey });
  if (!isValid)
    return res
      .status(401)
      .json({ status: "error", message: "Unauthorized User" });

  next();
}


export async function validateIP(req, res, next) {
    const allowedIPs = await User.findOne({ apikey: req.query.apikey }).select('whitelistedIPs').lean();
    // Get client IP address
    const clientIP = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // Clean IPv6-mapped IPv4 addresses (::ffff:192.168.1.1 -> 192.168.1.1)
    const cleanIP = clientIP.replace(/^::ffff:/, '');
    
    // If no IP restrictions, allow all
    if (!allowedIPs.whitelistedIPs || allowedIPs.whitelistedIPs.length === 0) {
      return next();
    }
    
    // Check if IP is in allowed list
    if (allowedIPs.whitelistedIPs.includes(cleanIP)) {
      return next();
    }
    
    // IP not allowed - return 403 Forbidden
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied. Your IP address is not authorized.',
      ip: cleanIP
    });
  };
