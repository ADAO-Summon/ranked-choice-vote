import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deleteAllRecords() {
  try {
    // Delete all Votes
    await prisma.vote.deleteMany();
    console.log('All Vote records deleted');

    // Delete all TestVotes
    await prisma.tiebreakVote.deleteMany();
    console.log('All TestVote records deleted');

    await prisma.voteResult.deleteMany()
    await prisma.voteBackup.deleteMany()
    await prisma.tiebreakVoteResult.deleteMany()
    await prisma.tiebreakBackupVotes.deleteMany()

    // Delete all Registrations
    await prisma.registration.deleteMany();
    console.log('All Registration records deleted');

    // Delete all RegistrationCodes
    await prisma.registrationCode.deleteMany();
    console.log('All RegistrationCode records deleted');

    // Delete all Workshops
    await prisma.workshop.deleteMany();
    console.log('All Workshop records deleted');

    console.log('All records deleted successfully');
  } catch (error) {
    console.error('Error deleting records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllRecords();