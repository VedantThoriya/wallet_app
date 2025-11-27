// src/routes/syncRoutes.js
import express from "express";
import { syncTransactions } from "../controllers/syncController.js";

const router = express.Router();

// Sync transactions to vector store
router.post("/", syncTransactions);

export default router;
