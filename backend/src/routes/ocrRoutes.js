import express from "express";
import multer from "multer";
import "dotenv/config";
import { processReceiptOCR } from "../controllers/geminiController.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/gemini", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Image file is required" });
  }

  const result = await processReceiptOCR({
    fileBuffer: req.file.buffer,
    mimeType: req.file.mimetype,
  });

  if (!result.success) {
    return res.status(500).json(result);
  }

  res.json(result);
});

export default router;
