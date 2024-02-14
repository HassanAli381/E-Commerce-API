const nodemailer = require('nodemailer');


const sendEmail = async(options) => {
    // 1) Create a transporter(sarvice that will send the email)
    const transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    // 2) Define the email options
    const mailOptions = {
        from: 'Hassan Ali <alhassanali599@gmail.com>',
        to: options.email,
        subject: options.subject,
        text: options.message,
    }

    // 3) Send email actually
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;