const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Bull = require('bull');
const emailQueue = new Bull('emailQueue', process.env.REDIS_URL);
const nodeSchedule = require('node-schedule');
const { ensureAuthenticated, hasRole } = require('./auth/auth');


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


// Example of dynamic content adjustment logic
// app.post('/send-email', ensureAuthenticated, (req, res) => {
//     const { userId, templateId } = req.body;
//     User.findById(userId, (err, user) => {
//       if (err) return res.status(500).send(err);
//       EmailTemplate.findById(templateId, (err, template) => {
//         if (err) return res.status(500).send(err);
//         const personalizedContent = adjustContentBasedOnBehavior(user, template.content);
//         // Send email with personalized content
//       });
//     });
//   });
  
//   function adjustContentBasedOnBehavior(user, content) {
//     // Placeholder for content adjustment logic based on user behavior
//     return content.replace('{firstName}', user.firstName); // Simplified example
//   }
  

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
app.post('/schedule-email', ensureAuthenticated, hasRole('admin'), (req, res) => {
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

// function hasRole(role) {
//     return function(req, res, next) {
//       if (req.user && req.user.role === role) {
//         next();
//       } else {
//         res.status(403).send('Unauthorized');
//       }
//     };
//   }

  // AB Testing route
  app.post('/ab-tests', (req, res) => {
    const { campaignId, variations } = req.body;
    createABTest(campaignId, variations).then(test => {
      res.status(201).send(test);
    }).catch(err => {
      res.status(400).send(err.message);
    });
  });
  
  function createABTest(campaignId, variations) {
    // Logic to split the email list and assign variations
    return new Promise((resolve, reject) => {
      // Simplified example logic
      resolve({ id: 'ab123', campaignId, variations });
    });
  }



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
