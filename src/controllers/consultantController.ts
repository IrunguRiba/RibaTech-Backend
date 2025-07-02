import { Request, Response } from 'express';
import pool from '../db/db';
import asyncHandler from '../middleware/asyncHandler/asyncHandler';
import { sendMail } from '../utils/helpers/emailService';

const REVIEWER_EMAIL = process.env.REVIEWER_EMAIL!;

export const submitConsultation = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log("✅ Received consultation request");
    console.log("📦 Request Body:", req.body);

    const {
      organization_name,
      full_name,
      phone,
      email,
      project_details,
      terms_accepted,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO consultations (
        organization_name, full_name, phone, email, project_details, terms_accepted
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [organization_name, full_name, phone, email, project_details, terms_accepted]
    );

    const inserted = result.rows[0];
    console.log("✅ Inserted into DB:", inserted);

    // Notify reviewer
    await sendMail(
      REVIEWER_EMAIL,
      'New Consultation Booking',
      `<h3>New Booking from ${full_name}</h3>
       <p><strong>Email:</strong> ${email}</p>
       <p><strong>Phone:</strong> ${phone}</p>
       <p><strong>Details:</strong> ${project_details}</p>`
    );

    // Email applicant after 10 minutes
    setTimeout(async () => {
      try {
        await sendMail(
          email,
          'Consultation Received',
          `<p>Hello ${full_name},</p>
           <p>Thank you for reaching out. We have received your consultation request and will contact you shortly.</p>`
        );
      } catch (emailError) {
        console.error("❌ Error sending delayed email to applicant:", emailError);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return res.status(201).json({
      message: 'Consultation submitted successfully.',
      consultation: inserted,
    });

  } catch (error) {
    console.error("🔥 Server error in consultation submission:", error); // 🛠 THIS WILL SHOW THE ERROR
    return res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message || error,
    });
  }
});
