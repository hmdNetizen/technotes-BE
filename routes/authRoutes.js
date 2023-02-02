const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const rateLimit = require("../middleware/loginLimiter");

router.route("/").post(rateLimit, authController.login);

router.route("/refresh").get(authController.refresh);

router.route("/logout").post(authController.logout);

module.exports = router;
