import express from "express";
const router = express.Router();
import cloudinary from "../services/cloudinaryConfig.js";
import Invoice from "../models/invoiceSchema.js";
import User from "../models/userSchema.js";
import Appointment from "../models/appointmentSchema.js";
import uploadSingleInvoice from "../middleware/multerSingleInvoiceMiddleware.js";
import checkToken from "../middleware/checkToken.js";


// Rota para criar uma nova fatura
router.post(
  "/create-invoice",
  checkToken,
  uploadSingleInvoice.single("file"),
  async (req, res) => {
    try {
      const invoiceData = await req.body;

      // Verifica se o usuário existe
      const user = await User.findById(invoiceData.user_obj).select(
        "-password"
      );
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verificar se o usuário atual é um admin
      console.log(user.user_type);
      if (user.user_type !== "admin") {
        return res
          .status(403)
          .send("Permission denied. Only admins can create invoices.");
      }

      // Verifica se o Appointment existe
      const appointment = await Appointment.findById(
        invoiceData.appointment_obj
      );

      if (!appointment) {
        return res.status(400).json({ error: "Appointment not found" });
      }

      // Verificar se foram enviadas fotos para a galeria
      if (!req.file || req.file.length === 0) {
        return res.status(400).send("No file provided");
      }

      const file = req.file;
      const public_id = `${appointment._id}-${appointment.user_obj}-${
        file.originalname.split(".")[0]
      }`;

      console.log(file);
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: "raw",
        allowedFormats: ["jpg", "png", "pdf"],
        public_id: public_id,
        overwrite: false,
        upload_preset: "wasGehtAb_preset",
      });

      if (!result.secure_url) {
        return res.status(500).send("Error uploading Invoice to cloudinary");
      }

      // Cria a fatura no schema Invoice
      const invoice = new Invoice({
        invoice_url: result.secure_url,
        user_obj: appointment.user_obj,
        appointment_obj: appointment._id,
        over_duo: invoiceData.over_duo,
        create_by: user.user_type,
        status: invoiceData.status,
      });

      // Verifique se appointment.invoice_obj é null ou undefined
      if (!appointment.invoice_obj) {
        // Se for null ou undefined, inicialize como um array vazio
        appointment.invoice_obj = [];
      }

      // Agora você pode chamar push com segurança
      appointment.invoice_obj.push(invoice._id);

      // Atualize a quantidade de faturas
      appointment.invoice_qnt = appointment.invoice_obj.length;

      // Salve as alterações no appointment
      await appointment.save();

      // Salve a fatura no banco de dados
      await invoice.save();

      res.status(200).json(invoice);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Rota para obter e atualizar o status das faturas com base nas datas
router.get("/fetch-invoices", async (req, res) => {
  try {
    const currentDate = Date.now();

    // Encontre todas as faturas
    const invoices = await Invoice.find({})
      .sort({ over_due: 1 })
      .select("-__v")
      .populate("user_obj", "client_number first_name last_name email phone")
      .populate("appointment_obj", "_id");

    for (const invoice of invoices) {
      if (invoice.over_duo < currentDate && invoice.status === "open") {
        await Invoice.updateOne(
          { _id: invoice._id },
          { $set: { status: "overduo" } }
        );
      }
    }
    for (const invoice of invoices) {
      if (invoice.over_duo < currentDate && invoice.status === "paid") {
        await Invoice.updateOne(
          { _id: invoice._id },
          { $set: { status: "paid" } }
        );
      }
    }
    for (const invoice of invoices) {
      if (invoice.over_duo > currentDate && invoice.status === "paid") {
        await Invoice.updateOne(
          { _id: invoice._id },
          { $set: { status: "paid" } }
        );
      }
    }
    for (const invoice of invoices) {
      if (invoice.over_duo < currentDate && invoice.status === "refunded") {
        await Invoice.updateOne(
          { _id: invoice._id },
          { $set: { status: "refunded" } }
        );
      }
    }
    for (const invoice of invoices) {
      if (invoice.over_duo > currentDate && invoice.status === "refunded") {
        await Invoice.updateOne(
          { _id: invoice._id },
          { $set: { status: "refunded" } }
        );
      }
    }
   
    // Recupere a lista atualizada de faturas após as atualizações
    const updatedInvoices = await Invoice.find({})
      .sort({ over_due: 1 })
      .select("-__v")
      .populate("user_obj", "client_number first_name last_name email phone")
      .populate("appointment_obj", "_id");

    res.status(200).json(updatedInvoices);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Rota para atualizar o status das faturas com base nas datas
router.put("/update-invoice-status", async (req, res) => {
  try {
    const currentDate =  Date.now();

    // Encontre todas as faturas
    const invoices = await Invoice.find({}).sort({ over_due: 1 });

    // Atualize o status para "overduo" se a fatura estiver vencida e com o status OPEN
    for (const invoice of invoices) {
      if (invoice.over_due < currentDate && invoice.status !== "open") {
        await Invoice.updateOne(
          { _id: invoice._id },
          { $set: { status: "overduo" } }
        );
      }
    }

    // Recupere a lista atualizada de faturas após as atualizações
    const updatedInvoices = await Invoice.find({}).sort({ over_due: 1 });

    res.status(200).json(updatedInvoices);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
