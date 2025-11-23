import express from "express";
import { analyzeExpensesController } from "../controllers/aiController.js";

const router = express.Router();

router.post("/analyze", analyzeExpensesController);

export default router;
