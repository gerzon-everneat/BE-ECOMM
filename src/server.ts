import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import session from "express-session";
import crypto from "crypto";
import axios from "axios";
import authRoutes from "./auth/email/authRoutes";
import cors from "cors";

const app = express();
const port = 4000;

const corsOptions = {
  origin: "*",
  // credentials: true,
};
// Load environment variables
const {
  HEADLESS_CLIENT_ID,
  // CLIENT_SECRET,
  HEADLESS_AUTHORIZATION_ENDPOINT,
  HEADLESS_TOKEN_ENDPOINT,
  HEADLESS_LOGOUT_ENDPOINT,
  REDIRECT_URI,
} = process.env;

if (
  !HEADLESS_CLIENT_ID ||
  // !CLIENT_SECRET ||
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
    secret: "-secret-key", // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

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
app.post("/auth", async (req: Request, res: Response) => {
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
    HEADLESS_AUTHORIZATION_ENDPOINT as string
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
app.get("/callback", async (req, res) => {
  const authorizationCode = req.query.code;
  const codeVerifier = req.session.codeVerifier;

  if (!authorizationCode) {
    res.status(400).send("Authorization code is missing");
    return;
  }

  try {
    if (!HEADLESS_CLIENT_ID) throw new Error("Missing client ID");
    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      HEADLESS_TOKEN_ENDPOINT,
      {
        client_id: HEADLESS_CLIENT_ID as string,
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    // Redirect to the client with the access token
    // const localhostRedirectUri = `http://localhost:5173?token=${accessToken}`;
    res.status(200).json({ accessToken });
  } catch (error) {
    console.log(
      "Failed to exchange authorization code for access token",
      error
    );

    res
      .status(400)
      .send("Failed to exchange authorization code for access token");
  }
});

app.use("/authenticate", authRoutes);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
