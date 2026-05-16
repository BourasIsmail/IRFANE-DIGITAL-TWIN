"use strict";

/**
 * get_token.js
 * ============
 * Get a Keyrock auth token for a user.
 * Usage:
 *   node get_token.js                          -> admin token
 *   node get_token.js operator@irfane.ma operator1234
 *   node get_token.js viewer@irfane.ma viewer1234
 */

const axios = require("axios");

const KEYROCK_URL = process.env.KEYROCK_URL || "http://localhost:3005";

const email    = process.argv[2] || process.env.IDM_ADMIN_EMAIL || "admin@irfane.ma";
const password = process.argv[3] || process.env.IDM_ADMIN_PASS  || "admin1234";

async function getToken() {
  const r = await axios.post(
    `${KEYROCK_URL}/v1/auth/tokens`,
    { name: email, password },
    { headers: { "Content-Type": "application/json" }, timeout: 5000 }
  );
  const token = r.headers["x-subject-token"];
  console.log(token);
}

getToken().catch(e => {
  console.error(`Error: ${e.response?.data?.error?.message || e.message}`);
  process.exit(1);
});