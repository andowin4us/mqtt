const dotenv = require('dotenv');
require('dotenv').config(); // load .env file
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Sample data
// const data = [
//     { DeviceName: "Device-12", DeviceId: "KT5138", Action: "Power is Connected", MacId: "00:1A:2B:3C:4D:5E", TimeofActivity: "2024-07-05T15:31:56+05:30" },
//     // Add more entries as needed
// ];

// Email sending function
async function sendEmail(recipient, deviceInfo, emailConfig) {
    const smtpServer = emailConfig.SMTP_SERVER;
    const port = parseInt(emailConfig.SMTP_PORT);
    const senderEmail = emailConfig.SMTP_SENDING_EMAIL;
    const password = emailConfig.SMTP_SENDING_PASSWORD;

    const transporter = nodemailer.createTransport({
        host: smtpServer,
        port: port,
        secure: true,
        auth: {
            user: senderEmail,
            pass: password
        }
    });

    // Read the image file and convert it to base64
    // const imagePath = path.join(__dirname, 'stock.jpg'); // Update with the path to your local image
    // const imageBase64 = fs.readFileSync(imagePath).toString('base64');
    const imageCid = 'logsense-logo@yourdomain.com'; // Unique identifier for the image

    const subject = `${deviceInfo.DeviceName} ${deviceInfo.Action} Alert`;
    const body = `
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; text-align: center; padding: 20px;">
        <div style="display: inline-block; background: #fff; padding: 20px; border: 1px solid #ccc; border-radius: 10px; max-width: 600px; margin: auto; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
            <img src="cid:${imageCid}" alt="Logsense" style="width: 150px; margin-bottom: 20px;">
            <h2 style="color: #4CAF50;">Device Alert Notification</h2>
            <p style="font-size: 16px;">Your account <strong>${deviceInfo.DeviceId}</strong> has performed an action: <strong>${deviceInfo.Action}</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f2f2f2;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: left;">Device Name</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${deviceInfo.DeviceName}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: left;">Device ID</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${deviceInfo.DeviceId}</td>
                </tr>
                <tr style="background: #f2f2f2;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: left;">Action</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${deviceInfo.Action}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: left;">MAC ID</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${deviceInfo.MacId}</td>
                </tr>
                <tr style="background: #f2f2f2;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: left;">Time of Activity</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${deviceInfo.TimeofActivity}</td>
                </tr>
            </table>
            <p style="font-size: 14px;">If this is not you, please <a href="#" style="color: #4CAF50;">You can Trigger the Trigger Relay</a> immediately.</p>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: senderEmail,
        to: recipient,
        subject: subject,
        html: body,
        attachments: [{
            filename: 'stock.jpg',
            // path: imagePath,
            cid: imageCid // Same CID value as in the html img src
        }]
    };

    try {
        let responseEmail = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${recipient} for ${deviceInfo.DeviceName}`);
        return responseEmail;
    } catch (error) {
        console.error(`Error sending email to ${recipient}: ${error}`);
    }
};

module.exports = {
    sendEmail
};