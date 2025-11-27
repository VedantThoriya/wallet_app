// src/routes/insightsRoutes.js
import express from "express";
import {
    generateUserInsights,
    sendInsightsViaEmail,
} from "../controllers/insightsController.js";

const router = express.Router();

// Generate insights
router.post("/generate", generateUserInsights);

// Send insights via email
router.post("/email", sendInsightsViaEmail);

export default router;
