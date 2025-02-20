import { PrismaClient } from '@prisma/client';

import cuid from 'cuid'

const prisma = new PrismaClient();


function generateShortId(name, existingIds = []) {
    // Convert to lowercase and remove special characters
    let shortId = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    // Replace spaces with hyphens and remove consecutive hyphens
    shortId = shortId.replace(/\s+/g, '-').replace(/-+/g, '-');

    // Take the first 7 characters
    shortId = shortId.slice(0, 7);

    // Remove trailing hyphens
    shortId = shortId.replace(/-+$/, '');

    // If the ID already exists, add a number to make it unique
    let uniqueId = shortId;
    let counter = 1;
    while (existingIds.includes(uniqueId)) {
        const suffix = counter.toString();
        uniqueId = shortId.slice(0, 7 - suffix.length) + suffix;
        counter++;
    }

    return uniqueId;
}


async function createWorkshop(name, adminEmail) {
    return prisma.workshop.create({
        data: {
            readableName: name,
            shortIdName: generateShortId(name),
            adminEmail
        }
    })
}

async function createAndInsertNewCodes(workshopId, amount = 200) {
    const rcs = []
    for (let i = 0; i < amount; i++) {
        const code = cuid()
        rcs.push({ code, workshopId })
    }
    return prisma.registrationCode.createMany({
        data: rcs
    })
}

async function setupDemoWorkshop() {
    const workshop = await createWorkshop("Beta Workshop Demo", "dzcodes@outlook.com")
    const codes = await createAndInsertNewCodes(workshop.id)
    console.log(`Created ${codes.count} codes for beta workshop`)
}

setupDemoWorkshop().finally('finished')
