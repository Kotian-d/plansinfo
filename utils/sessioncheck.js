export function isloggedIn(req, res, next) {
  if (req.session && req.session.user) {
    // Session exists, proceed to next middleware/route
    next();
  } else {
    // No valid session, redirect to login page or send error
    res.redirect('/login');
    // Or: res.status(401).send('Unauthorized');
  }
}
