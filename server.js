// Initialize Node.js Server
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Set up Nodemailer with Amazon SES
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'SES',
  auth: {
    user: process.env.SES_USER,
    pass: process.env.SES_PASS
  }
});

// Sending an email
app.post('/send-email', (req, res) => {
  const { to, subject, htmlContent } = req.body;
  const mailOptions = {
    from: 'your-email@example.com',
    to: to,
    subject: subject,
    html: htmlContent
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send(error.toString());
    }
    res.status(200).send('Email sent: ' + info.response);
  });
});

// MongoDB Setup and Mongoose Models (simplified example)
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  subscribed: Boolean
});

const User = mongoose.model('User', userSchema);
