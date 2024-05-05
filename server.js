const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Bull = require('bull');
const emailQueue = new Bull('emailQueue', process.env.REDIS_URL);
const nodeSchedule = require('node-schedule');

const dotenv = require('dotenv');
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(helmet());
app.use(cors());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something broke!' });
});

// Connection to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define a User model
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  subscribed: Boolean
});

const User = mongoose.model('User', userSchema);

// SMTP configuration for Nodemailer
const transporter = nodemailer.createTransport({
  service: 'SES',
  auth: {
    user: process.env.SES_USER,
    pass: process.env.SES_PASS
  }
});

// POST route to send an email
app.post('/send-email', (req, res, next) => {
  emailQueue.add({
    to: req.body.to,
    subject: req.body.subject,
    htmlContent: req.body.htmlContent
  });
  res.send('Email sending job added to the queue.');
});

// Routes for managing contacts
app.post('/contacts', (req, res) => {
    const newContact = new User(req.body);
    newContact.save()
      .then(contact => res.status(201).send(contact))
      .catch(err => res.status(400).send(err));
  });
  
  app.get('/contacts', (req, res) => {
    User.find({}, (err, contacts) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send(contacts);
      }
    });
  });
  
// SCHEDULE EMAIL ROUTE
const EmailSchedule = mongoose.model('EmailSchedule', new mongoose.Schema({
  emailTemplateId: mongoose.Schema.Types.ObjectId,
  sendDateTime: Date,
  recurrence: String,
  userId: mongoose.Schema.Types.ObjectId
}));

// Endpoint to schedule an email
app.post('/schedule-email', (req, res) => {
  const { emailTemplateId, sendDateTime, recurrence, userId } = req.body;
  const newSchedule = new EmailSchedule({ emailTemplateId, sendDateTime, recurrence, userId });
  newSchedule.save()
    .then(schedule => {
      nodeSchedule.scheduleJob(schedule.id.toString(), sendDateTime, () => {
        console.log(`Sending scheduled email for template ${emailTemplateId}`);
        // Actual email sending logic here
      });
      res.status(201).send(schedule);
    })
    .catch(err => res.status(400).send(err));
});




// Email sending job processor
emailQueue.process(async (job, done) => {
  const { to, subject, htmlContent } = job.data;
  const mailOptions = {
    from: 'your-email@example.com',
    to: to,
    subject: subject,
    html: htmlContent
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      done(error);
    } else {
      done();
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
