//auth routes
import { Router } from "express";
import verifyEmail from "./verify";
import validateEmail from "./validate";

const router = Router();

router.post("/email/validate", async (req, res) => {
  await validateEmail(req, res);
});
router.post("/email/verify", async (req, res) => {
  await verifyEmail(req, res);
});
router.get("/email/validate", async (req, res) => {
  res.status(200).send("Email validation route");
});

export default router;
