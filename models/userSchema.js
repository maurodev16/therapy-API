import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Invoice from "../models/invoiceSchema.js";
import Appointment from "../models/appointmentSchema.js";
import dotenv from "dotenv";
dotenv.config();

const bcryptSalt = process.env.BCRYPT_SALT;

const userSchema = new mongoose.Schema(
  {
    client_number: { type: Number, unique: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    user_type: { type: String, enum: ["admin", "client"]},
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isNew) {
    return next();
  }

  // Consulta o último client_number no banco de dados
  const lastClient = await mongoose
    .model("User", userSchema)
    .findOne({}, { client_number: 1 }, { sort: { client_number: -1 } })
    .lean();

  // Gera um novo client_number incrementando o último obtido
  const newClientNumber = (lastClient?.client_number || 99) + 1;
  this.client_number = newClientNumber;

  // Garante que user_id seja exclusivo e não nulo
  if (!this._id) {
    this._id = new mongoose.Types.ObjectId();
  }

  if (this.isModified("password")) {
    const hash = await bcrypt.hash(this.password, Number(bcryptSalt));
    this.password = hash;
  }

  next();
});

const User = mongoose.model("User", userSchema);

export default User;
