const {
  USERNAME,
  authCookie,
  createAuthToken,
  isValidCredential,
} = require("./_auth");

module.exports = function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  let body = req.body || {};
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body || "{}");
    } catch (err) {
      return res.status(400).json({ error: "Invalid request payload." });
    }
  }
  const username = (body.username || "").trim();
  const password = body.password || "";

  if (!isValidCredential(username, password)) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const token = createAuthToken(USERNAME);
  res.setHeader("Set-Cookie", authCookie(req, token));
  return res.status(200).json({ authenticated: true, username: USERNAME });
};
