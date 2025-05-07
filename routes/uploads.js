const express = require("express");
const multer = require("multer");
const supabase = require("../config/supabase");
const { authenticate } = require("../middlewares/auth");
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/",
  authenticate,
  upload.fields([
    { name: "projectLogo", maxCount: 1 },
    { name: "projectBanner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files;

      if (!files.projectLogo || files.projectLogo.length === 0) {
        return res.status(400).json({ message: "Project logo is required." });
      }

      const uploadToSupabase = async (file, prefix) => {
        const fileName = `${prefix}-${Date.now()}-${file.originalname}`;

        const { error } = await supabase.storage
          .from("project-images")
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (error) throw error;

        const { data } = supabase.storage
          .from("project-images")
          .getPublicUrl(fileName);

        return data.publicUrl;
      };

      const logoUrl = await uploadToSupabase(files.projectLogo[0], "logo");
      const bannerUrl = files.projectBanner?.[0]
        ? await uploadToSupabase(files.projectBanner[0], "banner")
        : null;

      res.status(200).json({ logoUrl, bannerUrl });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

module.exports = router;
