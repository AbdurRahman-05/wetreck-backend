import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cron from 'node-cron';
import { sendEmail } from './mail.js';
import connectDB from './db.js';
import sendAdminEmailRouter from './sendAdminEmail.js';

const app = express();
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(bodyParser.json());

// Connect to MongoDB
connectDB();

app.use('/api/v2', sendAdminEmailRouter);

const personDetailsSchema = new mongoose.Schema({
  name: String,
  age: String,
  relation: String,
  occupation: String,
  phone: String,
  email: String,
  city: String,
  state: String,
});

const healthDetailsSchema = new mongoose.Schema({
  heartConditions: String,
  respiratoryIssues: String,
  pastInjuries: String,
  otherConcerns: String,
});

const bikeDetailsSchema = new mongoose.Schema({
  type: String,
  name: String,
  cc: String,
  experience: String,
});

const bookingSharedSchema = {
  packageId: String,
  packageTitle: String,
  personCount: Number,
  date: String,
  personDetails: [personDetailsSchema],
  arrivalPlace: String,
  pickupNeeded: Boolean,
  isMember: Boolean,
  membershipId: String,
  finalAmount: Number,
  createdAt: { type: Date, default: Date.now },
};

// Schemas for different booking types
const tourBookingSchema = new mongoose.Schema({
  ...bookingSharedSchema,
});

const trekBookingSchema = new mongoose.Schema({
  ...bookingSharedSchema,
  healthDetails: healthDetailsSchema,
});

const bikeBookingSchema = new mongoose.Schema({
  ...bookingSharedSchema,
  bikeDetails: bikeDetailsSchema,
});

const TourBooking = mongoose.model('TourBooking', tourBookingSchema);
const TrekBooking = mongoose.model('TrekBooking', trekBookingSchema);
const BikeBooking = mongoose.model('BikeBooking', bikeBookingSchema);

// New endpoint for various bookings
app.post('/api/v2/booking', async (req, res) => {
  try {
    const { bookingType, ...bookingData } = req.body;
    let booking;

    switch (bookingType) {
      case 'tour':
        booking = new TourBooking(bookingData);
        break;
      case 'trek':
        booking = new TrekBooking(bookingData);
        break;
      case 'bike':
        booking = new BikeBooking(bookingData);
        break;
      default:
        return res.status(400).json({ error: 'Invalid booking type' });
    }

    await booking.save();

    try {
      // Send booking email to user and admin
      const userEmail = bookingData.personDetails && bookingData.personDetails[0] ? bookingData.personDetails[0].email : null;
      const adminEmail = process.env.EMAIL_USER;
      const subject = `Booking Confirmation: ${bookingData.packageTitle}`;
      const html = `
        <h1>Booking Details</h1>
        <p>Package: ${bookingData.packageTitle}</p>
        <p>Date: ${bookingData.date}</p>
        <p>Persons: ${bookingData.personCount}</p>
        <p>Arrival Place: ${bookingData.arrivalPlace}</p>
        <p>Pickup Needed: ${bookingData.pickupNeeded ? 'Yes' : 'No'}</p>
        <h3>Person Details:</h3>
        ${bookingData.personDetails.map(person => `
          <ul>
            <li>Name: ${person.name}</li>
            <li>Age: ${person.age}</li>
            <li>Relation: ${person.relation}</li>
            <li>Occupation: ${person.occupation}</li>
            <li>Phone: ${person.phone}</li>
            <li>Email: ${person.email}</li>
            <li>City: ${person.city}</li>
            <li>State: ${person.state}</li>
          </ul>
        `).join('')}
      `;
      if (userEmail) await sendEmail(userEmail, subject, html);
      if (adminEmail) await sendEmail(adminEmail, subject, html);
      res.json({ message: 'Booking info received, saved, and emails sent.' });
    } catch (emailError) {
      console.error('Failed to send booking emails:', emailError);
      res.status(200).json({ message: 'Booking info saved, but failed to send emails.' });
    }
  } catch (err) {
    console.error('Failed to save booking info:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to save booking info.', details: err.message });
  }
});


const membershipSchema = new mongoose.Schema({
  name: String,
  dob: String,
  mobile: String,
  email: String,
  occupation: String,
  address: String,
  membershipPlan: String,
  amount: Number,
  startDate: Date,
  endDate: Date,
  expirationNotified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  uniqueCode: String
});
const Membership = mongoose.model('Membership', membershipSchema);



// Endpoint to receive membership form submissions
app.post('/api/membership', async (req, res) => {
  try {
  const { name, dob, mobile, email, occupation, address, membershipPlan, amount, startDate, endDate } = req.body;
  console.log('Received membershipPlan value:', membershipPlan);
  const uniqueCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const member = new Membership({ name, dob, mobile, email, occupation, address, membershipPlan: membershipPlan || 'Not specified', amount, startDate, endDate, uniqueCode });
    await member.save();

    try {
      // Membership plan details
      let planDetails = '';
        const planValue = (membershipPlan || '').trim().toLowerCase();
        if (['2 years plan', '2 years membership', '299', 'two years plan', 'two years membership', '2 year plan', '2 year membership'].includes(planValue)) {
          planDetails = `
            <h3>Selected Plan: 2 Years Membership</h3>
            <p><strong>Amount:</strong> ₹299</p>
            <ul>
              <li>Valid for 2 years</li>
              <li>Exclusive trek and bike ride offers</li>
              <li>Priority booking for popular treks</li>
              <li>Access to member-only events and webinars</li>
              <li>Personalized gear consultation</li>
              <li>Digital membership card</li>
            </ul>
          `;
          if (startDate && endDate) {
            planDetails += `
              <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</p>
            `;
          }
        } else if (['lifetime plan', 'lifetime membership', '999', 'life time plan', 'life time membership'].includes(planValue)) {
          planDetails = `
            <h3>Selected Plan: Lifetime Membership</h3>
            <p><strong>Amount:</strong> ₹999</p>
            <ul>
              <li>Lifetime exclusive discounts on all treks</li>
              <li>Free annual trek (one per year)</li>
              <li>Dedicated trek consultant for planning</li>
              <li>VIP access to member events and expeditions</li>
              <li>Physical and digital membership card</li>
              <li>Special recognition in our community</li>
            </ul>
          `;
        } else if (planValue !== '') {
          planDetails = `<h3>Selected Plan: ${membershipPlan}</h3>`;
        } else {
          planDetails = `<p><strong>No plan was selected.</strong></p>`;
        }

      const subject = 'New Membership Registration';
      const html = `
        <h1>New Membership Registration</h1>
        <p>A new user has registered with the following details:</p>
        <ul>
          <li>Name: ${name}</li>
          <li>Date of Birth: ${dob}</li>
          <li>Mobile: ${mobile}</li>
          <li>Email: ${email}</li>
          <li>Occupation: ${occupation}</li>
          <li>Address: ${address}</li>
          <li>Unique Code: ${uniqueCode}</li>
        </ul>
        <h2>Selected Membership Plan</h2>
        ${planDetails}
      `;

      // Send email to admin
      await sendEmail(process.env.EMAIL_USER, subject, html);

      // Send confirmation email to user
      const userSubject = 'Welcome to our Membership!';
      const userHtml = `
        <h1>Welcome to wetreck membership plan!</h1>
        <p>Thank you for registering for our membership.</p>
        <p>Your Unique Membership Code is: <strong>${uniqueCode}</strong></p>
        <h2>Your Selected Plan</h2>
        ${planDetails}
        <p>Your chosen plan amount is: ${membershipPlan === '2 Years Membership' || membershipPlan === '299' ? '₹299' : (membershipPlan === 'Lifetime Membership' || membershipPlan === '999' ? '₹999' : 'Not specified')}.</p>
        <p>We are excited to have you on board.</p>
      `;
      await sendEmail(email, userSubject, userHtml);

      res.json({ message: 'Membership info received, saved, and emails sent.' });
    } catch (emailError) {
      console.error('Failed to send emails:', emailError);
      // Still return success to the client, but log the email error
      res.status(200).json({ message: 'Membership info saved, but failed to send emails.' });
    }

  } catch (err) {
    console.error('Failed to save membership info:', err);
    res.status(500).json({ error: 'Failed to save membership info.' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  const users = await Membership.find();
  res.json(users);
});

// Schedule a task to run every day at midnight to check for expired memberships
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily check for expired memberships...');
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to the beginning of the day

  try {
    const expiredMembers = await Membership.find({
      endDate: { $lt: today },
      expirationNotified: false,
    });

    for (const member of expiredMembers) {
      // Send email to user
      const userSubject = 'Your Membership Has Expired';
      const userHtml = `<h1>Your Membership Has Expired</h1><p>Hi ${member.name}, your ${member.membershipPlan} has expired on ${new Date(member.endDate).toLocaleDateString()}. Please renew to continue enjoying the benefits.</p>`;
      await sendEmail(member.email, userSubject, userHtml);

      // Send email to admin
      const adminSubject = `Membership Expired for ${member.name}`;
      const adminHtml = `<h1>Membership Expired</h1><p>The membership for ${member.name} (${member.email}) has expired on ${new Date(member.endDate).toLocaleDateString()}.</p>`;
      await sendEmail(process.env.EMAIL_USER, adminSubject, adminHtml);

      // Mark the member as notified to avoid re-sending emails
      member.expirationNotified = true;
      await member.save();
    }
  } catch (error) {
    console.error('Error checking for expired memberships:', error);
  }
});

// Endpoint to validate membership
app.post('/api/validate-membership', async (req, res) => {
  try {
    const { email, membershipId } = req.body;
    const member = await Membership.findOne({ email: email, uniqueCode: membershipId });

    if (member) {
      res.json({ isValid: true, member });
    } else {
      res.json({ isValid: false, message: 'Invalid membership ID or email' });
    }
  } catch (err) {
    console.error('Failed to validate membership:', err);
    res.status(500).json({ error: 'Failed to validate membership.' });
  }
});

app.listen(5002, () => {
  console.log('Backend server running on port 5002');
});