import nodemailer from 'nodemailer'
import PDFDocument from 'pdfkit'
import prisma from '@/lib/prismaClient'

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.LOCAL !== 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

function generatePDF(codes: string[], shortIdName: string, readableName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 0
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        const cardWidth = 180;  // in points (1/72 of an inch)
        const cardHeight = 100;
        const cardsPerRow = 3;
        const cardsPerColumn = 7;
        const marginX = (doc.page.width - (cardWidth * cardsPerRow)) / 2;
        const marginY = (doc.page.height - (cardHeight * cardsPerColumn)) / 2;

        codes.forEach((code, index) => {
            if (index > 0 && index % (cardsPerRow * cardsPerColumn) === 0) {
                doc.addPage();
            }

            const row = Math.floor((index % (cardsPerRow * cardsPerColumn)) / cardsPerRow);
            const col = index % cardsPerRow;

            const x = marginX + (col * cardWidth);
            const y = marginY + (row * cardHeight);

            // Draw card rectangle
            doc.font('Helvetica')
                .fontSize(8)
                .text(`(${shortIdName})`, x + 10, y + 85, {
                    width: cardWidth - 20,
                    align: 'center'
                });

            doc.font('Helvetica')
                .fontSize(10)
                .text(readableName, x + 10, y + 70, {
                    width: cardWidth - 20,
                    align: 'center'
                });


            doc.rect(x, y, cardWidth, cardHeight)
                .lineWidth(1)
                .stroke();

            // Add code text
            doc.font('Helvetica-Bold')
                .fontSize(14)
                .text(code, x + 10, y + 40, {
                    width: cardWidth - 20,
                    align: 'center'
                });

            // Add "Registration Code" text
            doc.font('Helvetica')
                .fontSize(10)
                .text('Registration Code', x + 10, y + 10, {
                    width: cardWidth - 20,
                    align: 'center'
                });
        });

        doc.end();
    });
}


async function sendRegistrationCodesAsPDF(receivingEmail: string, workshopName: string, workshopIdName: string, codes: string[]) {
    try {
        const pdfBuffer = await generatePDF(codes, workshopIdName, workshopName);

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: receivingEmail,
            subject: 'Registration Codes',
            text: `Please find attached the registration codes for workshop: ${workshopName}`,
            attachments: [
                {
                    filename: `registration_codes_${workshopIdName}.pdf`,
                    content: pdfBuffer
                }
            ]
        };

        transporter.sendMail(mailOptions, (error: any, info: { response: any; }) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });
    } catch (error) {
        console.log('Error generating PDF:', error);
    }
}

export default async function receiveRegistrationCodes(workshopId: string, receivingEmail: string, count: number = 1000) {
    const workshop = await prisma.workshop.findUnique({
        where: {
            id: workshopId
        },
        include: {
            registrationCodes: {
                take: count
            }
        },
    })

    if (!workshop) throw 'Workshop not found'

    return sendRegistrationCodesAsPDF(receivingEmail, workshop.readableName, workshop.shortIdName, workshop.registrationCodes.map(rc => rc.code))
}