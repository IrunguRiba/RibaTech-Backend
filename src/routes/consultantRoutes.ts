import express from 'express';
import { submitConsultation } from '../controllers/consultantController';

const router = express.Router();

router.post('/', submitConsultation);

export default router;
