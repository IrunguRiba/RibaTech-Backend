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

    if (
      !organization_name ||
      !full_name ||
      !phone ||
      !email ||
      !project_details ||
      typeof terms_accepted === 'undefined'
    ) {
      console.warn("⚠️ Missing required fields");
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await pool.query(
      `INSERT INTO consultations (
        organization_name, full_name, phone, email, project_details, terms_accepted
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [organization_name, full_name, phone, email, project_details, terms_accepted]
    );

    const inserted = result.rows[0];
    console.log("✅ Inserted consultation:", inserted);

    // Email reviewer immediately
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
      } catch (emailErr) {
        console.error('❌ Failed to send delayed applicant email:', emailErr);
      }
    }, 10 * 60 * 1000); // 10 minutes

    res.status(201).json({
      message: 'Consultation submitted successfully. Await further contact.',
      consultation: inserted,
    });

  } catch (err: any) {
    console.error("🔥 Server error in consultation submission:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});
