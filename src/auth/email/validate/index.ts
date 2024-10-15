import { createTransport } from "nodemailer";
import { Response, Request } from "express";
import clientPromise, { COLLECTION } from "../../../mongodb";
import { isValidEmail } from "../functions";

const DB_NAME =
  process.env.NODE_ENV === "development"
    ? process.env.DATABASE_DEV
    : process.env.DATABASE_LIVE;

const transConfig: any = {
  host: process.env.AWS_SMTP_HOST,
  port: process.env.AWS_SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.AWS_SMTP_USER,
    pass: process.env.AWS_SMTP_PASSWORD,
  },
};
const transporter = createTransport(transConfig);

const messageOptions = (code: string, to: string) => {
  const verificationCodeTemplate = `
  <h1>Neatlist Email Verification</h1>
  <p>Your verification code is: <strong>${code}</strong></p>`;
  return {
    from: process.env.AWS_SMTP_SENDER, // sender address
    to,
    subject: "Neatlist Email Verification",
    text: "", //Ahmad leave this empty for email text content preview
    html: verificationCodeTemplate,
  };
};

export default async function validateEmail(req: Request, res: Response) {
  const { email } = req.body;

  try {
    //validate email
    isValidEmail(email);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    // check if code already sent
    const found = await db
      .collection(COLLECTION.NAME.EMAIL_VERIFICATION)
      .findOne({ email });
    const currentDate = new Date().getTime(); // 200pm
    let expiration_date = null;
    let sendNew = false;
    if (found) {
      sendNew = currentDate >= new Date(found.expiration_date).getTime();
      expiration_date = found.expiration_date;
    }
    if (!found || sendNew) {
      //  no existing code
      transporter.verify((err, success) => {
        if (err) throw err;
        // nodemailer config correct
      });
      //  generating code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      //  sending
      await transporter.sendMail(messageOptions(code, email));

      expiration_date = new Date(currentDate + 600000);
      // create record
      const data = {
        expiration_date,
        email,
        code,
      };
      //  save code
      if (found) {
        await db
          .collection(COLLECTION.NAME.EMAIL_VERIFICATION)
          .updateOne({ _id: found._id }, { $set: data });
      } else {
        await db.collection(COLLECTION.NAME.EMAIL_VERIFICATION).insertOne(data);
      }
    }
    return res.status(200).json({ expiration_date });
  } catch (error) {
    //handle error
    //check error type
    if (typeof error === "string") {
      return res.status(400).json({ error });
    } else if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    } else {
      return res
        .status(400)
        .json({ error: "An error occurred  while validating email" });
    }
  }
}
