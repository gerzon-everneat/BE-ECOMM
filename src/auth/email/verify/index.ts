import { Response, Request } from "express";
import clientPromise, { COLLECTION } from "../../../mongodb";
import { isValidEmail } from "../functions";
const DB_NAME =
  process.env.NODE_ENV === "development"
    ? process.env.DATABASE_DEV
    : process.env.DATABASE_LIVE;
export default async function verifyEmail(req: Request, res: Response) {
  const { email, code } = req.body;
  try {
    if (isNaN(code) || code.length !== 6) throw new Error("Invalid code");
    isValidEmail(email);
    const currentDate = new Date().getTime();
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const foundVerif = await db
      .collection(COLLECTION.NAME.EMAIL_VERIFICATION)
      .findOne({ email, code });
    const expiry =
      !!foundVerif &&
      currentDate < new Date(foundVerif.expiration_date).getTime();
    if (!expiry)
      throw new Error("The verification code is invalid or expired. Try again");

    // generateToken({
    //     ...user,
    //     email,
    //     });

    await db
      .collection(COLLECTION.NAME.EMAIL_VERIFICATION)
      .deleteOne({ _id: foundVerif._id });
    // verified

    return res.redirect(process.env.BE_URL_LIVE + "/auth");
  } catch (error) {
    console.error(error);
    return res.status(400).send(error);
  }
}
