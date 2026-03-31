const crypto = require("crypto");

const AUTH_COOKIE = "mural_auth";
const COOKIE_TTL_SECONDS = 60 * 60 * 8;
const COOKIE_PATH = "/";

const USERNAME = process.env.MURAL_ADMIN_USER || "admin";
const PASSWORD = process.env.MURAL_ADMIN_PASSWORD || "essilor@lux";
const SECRET = process.env.MURAL_AUTH_SECRET || "mural-auth-secret-change-me";

function signPayload(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

function createAuthToken(username) {
  const payload = JSON.stringify({
    username,
    exp: Date.now() + COOKIE_TTL_SECONDS * 1000,
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${signPayload(encoded)}`;
}

function parseCookies(header) {
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return acc;
    acc[k] = rest.join("=");
    return acc;
  }, {});
}

function verifyAuthToken(token) {
  if (!token || token.indexOf(".") === -1) return null;
  const [encoded, signature] = token.split(".");
  const expected = signPayload(encoded);
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function shouldUseSecureCookie(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string") {
    return forwardedProto.split(",")[0].trim() === "https";
  }
  const host = req.headers.host || "";
  return host.indexOf("localhost") === -1 && host.indexOf("127.0.0.1") === -1;
}

function authCookie(req, value) {
  const secure = shouldUseSecureCookie(req) ? "; Secure" : "";
  return `${AUTH_COOKIE}=${value}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_TTL_SECONDS}${secure}`;
}

function clearAuthCookie(req) {
  const secure = shouldUseSecureCookie(req) ? "; Secure" : "";
  return `${AUTH_COOKIE}=; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function readAuthFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifyAuthToken(cookies[AUTH_COOKIE]);
}

function isValidCredential(username, password) {
  return username === USERNAME && password === PASSWORD;
}

module.exports = {
  USERNAME,
  authCookie,
  clearAuthCookie,
  createAuthToken,
  isValidCredential,
  readAuthFromRequest,
};
