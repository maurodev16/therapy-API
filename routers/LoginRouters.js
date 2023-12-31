import dotenv from "dotenv";
import express from "express";
import User from "../models/userSchema.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import mongoose from "mongoose";

dotenv.config();
const router = express.Router();

const BCRYPT_SALT = process.env.BCRYPT_SALT;
const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY;

/// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // Validate User data
    if (!email) {
      console.log(email);

      return res.status(422).send("Please provide a valid email!");
    }

    let user;

    // Check if Email is an email using regular expression
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (isEmail) {
      user = await User.findOne({ email: email });
      console.log(email);
    } else {
      // Find user using email
      user = await User.findOne({
        email: { $regex: `^${email}`, $options: "i" },
      });
      console.log(user);
    }

    if (!user) {
      return res.status(404).send("No User found with this email!");
    }

    if (!password) {
      return res.status(422).json("Password is required!");
    }
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(422).json("Incorrect password");
    }

    // Generate token
    const token = jwt.sign(
      {
        _id: user._id,
        user_type: user.user_type,
        client_number: user.client_number,
      },
      AUTH_SECRET_KEY,
      {
        //  expiresIn: "1h", // Token expiration time
      }
    );

    // Return the authentication token and user information

    return res.status(200).json({
      _id: user._id,
      client_number: user.client_number,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      user_type: user.user_type,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      token,
    });
  } catch (error) {
    console.log(error);
    console.log(error)
    return res.status(500).send("An error occurred during login.");
  }
});

export default router;
