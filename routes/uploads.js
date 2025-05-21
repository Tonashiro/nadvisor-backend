const express = require("express");
const multer = require("multer");
const supabase = require("../config/supabase");
const { authenticate, isAdmin } = require("../middlewares/auth");
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/",
  authenticate,
  isAdmin,
  upload.fields([
    { name: "projectLogo", maxCount: 1 },
    { name: "projectBanner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files;

      // Helper function to upload a file to Supabase
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

      // Upload projectLogo if provided
      let logoUrl = null;
      if (files.projectLogo && files.projectLogo.length > 0) {
        logoUrl = await uploadToSupabase(files.projectLogo[0], "logo");
      }

      // Upload projectBanner if provided
      let bannerUrl = null;
      if (files.projectBanner && files.projectBanner.length > 0) {
        bannerUrl = await uploadToSupabase(files.projectBanner[0], "banner");
      }

      // Return the uploaded URLs
      res.status(200).json({ logoUrl, bannerUrl });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

module.exports = router;
