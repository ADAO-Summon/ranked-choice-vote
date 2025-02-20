import PDFDocument from 'pdfkit'
import prisma from '@/lib/prismaClient'

export default async function generateRegistrationCodesPDF(workshopId: string, count: number = 1000): Promise<Buffer> {
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

  if (!workshop) throw new Error('Workshop not found')

  const codes = workshop.registrationCodes.map(rc => rc.code)

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

    const cardWidth = 180;
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

      doc.rect(x, y, cardWidth, cardHeight)
        .lineWidth(1)
        .stroke();

      doc.font('Helvetica')
        .fontSize(8)
        .text(`(${workshop.shortIdName})`, x + 10, y + 85, {
          width: cardWidth - 20,
          align: 'center'
        });

      doc.font('Helvetica')
        .fontSize(10)
        .text(workshop.readableName, x + 10, y + 70, {
          width: cardWidth - 20,
          align: 'center'
        });

      doc.font('Helvetica-Bold')
        .fontSize(14)
        .text(code, x + 10, y + 40, {
          width: cardWidth - 20,
          align: 'center'
        });

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