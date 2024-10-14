import express, { Request, Response } from "express";
import session from "express-session";
import dotenv from "dotenv";
import crypto from "crypto";

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

// Configure express-session middleware
app.use(
  session({
    secret: "your-secret-key", // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// Function to generate a code verifier
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Function to generate a code challenge
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// Extend the Request type to include session
declare module "express-session" {
  interface SessionData {
    codeVerifier: string;
  }
}

// Endpoint to initiate the authorization process
app.get("/auth", async (req: Request, res: Response) => {
  const clientId = HEADLESS_CLIENT_ID;
  const redirectUri = REDIRECT_URI;
  const state = "some-random-state"; // You should generate a random state for security
  const nonce = "some-random-nonce"; // You should generate a random nonce for security

  if (!clientId || !redirectUri) {
    res.status(500).send("Missing environment variables");
    return;
  }

  // Generate code verifier and code challenge
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  // Store the code verifier in the session
  req.session.codeVerifier = verifier;

  const authorizationRequestUrl = new URL(
    process.env.HEADLESS_AUTHORIZATION_ENDPOINT as string
  );

  authorizationRequestUrl.searchParams.append(
    "scope",
    "openid email customer-account-api:full"
  );
  authorizationRequestUrl.searchParams.append("client_id", clientId);
  authorizationRequestUrl.searchParams.append("response_type", "code");
  authorizationRequestUrl.searchParams.append("redirect_uri", redirectUri);
  authorizationRequestUrl.searchParams.append("state", state);
  authorizationRequestUrl.searchParams.append("nonce", nonce);
  authorizationRequestUrl.searchParams.append("code_challenge", challenge);
  authorizationRequestUrl.searchParams.append("code_challenge_method", "S256");

  console.log("Authorization URL:", authorizationRequestUrl.toString());
  res.redirect(authorizationRequestUrl.toString());
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.send("Server is running");
});

// Callback endpoint to handle the authorization response
app.get("/callback", async (req: Request, res: Response): Promise<void> => {
  console.log("Callback query:", req.query);
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
