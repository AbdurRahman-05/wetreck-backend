import express from 'express';
const router = express.Router();
import { sendEmail } from './mail.js';

router.post('/send-admin-email', async (req, res) => {
  const { subject, recipient, ...bookingData } = req.body;

  const emailContent = `
    <h1>${subject}</h1>
    <p>A new booking has been made with a pickup request.</p>
    <h2>Booking Details:</h2>
    <ul>
      <li>Package: ${bookingData.packageTitle}</li>
      <li>Persons: ${bookingData.personCount}</li>
      <li>Date: ${bookingData.date}</li>
      <li>Arrival Place: ${bookingData.arrivalPlace}</li>
      <li>Pickup Needed: ${bookingData.pickupNeeded ? 'Yes' : 'No'}</li>
    </ul>
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

  try {
    await sendEmail(recipient, subject, emailContent);
    res.status(200).json({ message: 'Admin email sent successfully' });
  } catch (error) {
    console.error('Error sending admin email:', error);
    res.status(500).json({ message: 'Failed to send admin email' });
  }
});

export default router;
