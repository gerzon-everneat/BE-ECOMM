import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 4000;

// Load environment variables
const {
  HEADLESS_CLIENT_ID,
  HEADLESS_AUTHORIZATION_ENDPOINT,
  HEADLESS_TOKEN_ENDPOINT,
  HEADLESS_LOGOUT_ENDPOINT,
  REDIRECT_URI,
} = process.env;

if (
  !HEADLESS_CLIENT_ID ||
  !HEADLESS_AUTHORIZATION_ENDPOINT ||
  !HEADLESS_TOKEN_ENDPOINT ||
  !HEADLESS_LOGOUT_ENDPOINT ||
  !REDIRECT_URI
) {
  console.error("Missing environment variables");
  process.exit(1);
}

// Endpoint to initiate the authorization process
app.get("/auth", (req: Request, res: Response) => {
  const authorizationUrl = `${HEADLESS_AUTHORIZATION_ENDPOINT}?client_id=${HEADLESS_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=read_products`;
  res.redirect(authorizationUrl);
});

// Callback endpoint to handle the authorization response
app.get("/callback", async (req: Request, res: Response): Promise<void> => {
  const authorizationCode = req.query.code as string;
  console.log("Authorization code:", authorizationCode, req.query);

  if (!authorizationCode) {
    res.status(400).send("Authorization code is missing");
    return;
  }

  // Optionally, exchange the authorization code for an access token here

  // Redirect or send the authorization code (or token) to the localhost client
  const localhostRedirectUri = `http://localhost:5173/callback?code=${authorizationCode}`;
  res.redirect(localhostRedirectUri);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
