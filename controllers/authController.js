const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");

// @desc Login
// @route POST /auth
// @accss Public

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // If there is username and password fields, then find the user in the DB based on the username
  const foundUser = await User.findOne({ username }).exec();

  if (!foundUser || !foundUser.active) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // If user is found, validate the input password with the password saved in the DB
  const isMatch = await bcrypt.compare(password, foundUser.password);

  if (!isMatch) return res.status(401).json({ message: "Unauthorized" });

  // If the password matches the saved password, then issue an access token and refresh token
  const accessToken = jwt.sign(
    {
      UserInfo: {
        username: foundUser.username,
        roles: foundUser.roles,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "30s" }
  );

  const refreshToken = jwt.sign(
    {
      username: foundUser.username,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "1m" }
  );

  res.cookie("jwt", refreshToken, {
    secure: true,
    httpOnly: true,
    sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000, //Should be set to the expiry date of the refreshToken
  });

  //   Send access token containing username and roles to the user
  res.json({ accessToken });
});

// @desc Refresh
// @route GET /auth/refresh
// @accss Public - because access token is expired
const refresh = asyncHandler(async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.status(401).json({ message: "Unauthorized" });

  // If the jwt refreshToken does exists, then proceed to issue a new access token
  const refreshToken = cookies.jwt;
  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    asyncHandler(async (err, decoded) => {
      if (err) return res.status(403).json({ message: "Forbidden" });

      const foundUser = await User.findOne({
        username: decoded.username,
      }).exec();

      if (!foundUser) return res.status(401).json({ message: "Unauthorized" });

      const accessToken = jwt.sign(
        {
          UserInfo: {
            username: foundUser.username,
            roles: foundUser.roles,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "30s" }
      );

      res.json({ accessToken });
    })
  );
});

// @desc Logout
// @route POST /auth/logout
// @accss Public - just to clear the cookie if it exists

const logout = asyncHandler(async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.sendStatus(204);

  res.clearCookie("jwt", {
    secure: true,
    sameSite: "None",
    httpOnly: true,
  });

  res.json({ message: "Cookie cleared" });
});

module.exports = { login, refresh, logout };
