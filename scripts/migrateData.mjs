import { PrismaClient as SourcePrismaClient } from '../prisma/generated/client/index.js'
import { PrismaClient as TargetPrismaClient } from '../prisma/generated/client-target/index.js'
import dotenv from 'dotenv'

dotenv.config()

const sourceClient = new SourcePrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
})

const targetClient = new TargetPrismaClient({
    datasources: {
        new_db: {
            url: process.env.POSTGRES_PRISMA_URL,
            // directUrl: process.env.POSTGRES_URL_NON_POOLING,
        },
    },
})


const BATCH_SIZE = 100;

async function batchMigrate(sourceFn, targetFn, name) {
    let skip = 0;
    let migrated = 0;
    while (true) {
        const batch = await sourceFn({ skip, take: BATCH_SIZE });
        if (batch.length === 0) break;
        await targetFn(batch);
        migrated += batch.length;
        console.log(`Migrated ${migrated} ${name}`);
        skip += BATCH_SIZE;
    }
    console.log(`Finished migrating ${name}`);
}


async function migrateData() {
    try {
        // Migrate Workshops
        // await batchMigrate(
        //     (params) => sourceClient.workshop.findMany(params),
        //     (batch) => targetClient.workshop.createMany({ data: batch }),
        //     'Workshops'
        // );

        // // Migrate Users
        // await batchMigrate(
        //     (params) => sourceClient.user.findMany(params),
        //     (batch) => targetClient.user.createMany({ data: batch }),
        //     'Users'
        // );

        // Migrate RegistrationCodes
        await batchMigrate(
            (params) => sourceClient.registrationCode.findMany(params),
            (batch) => targetClient.registrationCode.createMany({ data: batch }),
            'Registration Codes'
        );

        // Migrate Registrations
        await batchMigrate(
            (params) => sourceClient.registration.findMany(params),
            (batch) => targetClient.registration.createMany({ data: batch }),
            'Registrations'
        );

        // Migrate Votes
        await batchMigrate(
            (params) => sourceClient.vote.findMany(params),
            (batch) => targetClient.vote.createMany({ data: batch }),
            'Votes'
        );

        // Migrate VoteBackups
        await batchMigrate(
            (params) => sourceClient.voteBackup.findMany(params),
            (batch) => targetClient.voteBackup.createMany({ data: batch }),
            'Vote Backups'
        );

        // Migrate VoteResults
        await batchMigrate(
            (params) => sourceClient.voteResult.findMany(params),
            (batch) => targetClient.voteResult.createMany({ data: batch }),
            'Vote Results'
        );

        // Migrate TiebreakVotes
        await batchMigrate(
            (params) => sourceClient.tiebreakVote.findMany(params),
            (batch) => targetClient.tiebreakVote.createMany({ data: batch }),
            'Tiebreak Votes'
        );

        // Migrate TiebreakVoteResults
        await batchMigrate(
            (params) => sourceClient.tiebreakVoteResult.findMany(params),
            (batch) => targetClient.tiebreakVoteResult.createMany({ data: batch }),
            'Tiebreak Vote Results'
        );

        // Migrate TiebreakBackupVotes
        await batchMigrate(
            (params) => sourceClient.tiebreakBackupVotes.findMany(params),
            (batch) => targetClient.tiebreakBackupVotes.createMany({ data: batch }),
            'Tiebreak Backup Votes'
        );

        // Migrate TiebreakRounds
        await batchMigrate(
            (params) => sourceClient.tiebreakRound.findMany(params),
            (batch) => targetClient.tiebreakRound.createMany({ data: batch }),
            'Tiebreak Rounds'
        );

        // Migrate Managers
        await batchMigrate(
            (params) => sourceClient.manager.findMany(params),
            (batch) => targetClient.manager.createMany({ data: batch }),
            'Managers'
        );

        // Migrate ManagerActions
        await batchMigrate(
            (params) => sourceClient.managerAction.findMany(params),
            (batch) => targetClient.managerAction.createMany({ data: batch }),
            'Manager Actions'
        );

        // Migrate VerificationTokens
        await batchMigrate(
            (params) => sourceClient.verificationToken.findMany(params),
            (batch) => targetClient.verificationToken.createMany({ data: batch }),
            'Verification Tokens'
        );

        // Migrate AdminActionLogs
        await batchMigrate(
            (params) => sourceClient.adminActionLog.findMany(params),
            (batch) => targetClient.adminActionLog.createMany({ data: batch }),
            'Admin Action Logs'
        );

        // Migrate ErrorLogs
        await batchMigrate(
            (params) => sourceClient.errorLog.findMany(params),
            (batch) => targetClient.errorLog.createMany({ data: batch }),
            'Error Logs'
        );

        // Migrate MPCBackupFactorKeys
        await batchMigrate(
            (params) => sourceClient.mPCBackupFactorKey.findMany(params),
            (batch) => targetClient.mPCBackupFactorKey.createMany({ data: batch }),
            'MPC Backup Factor Keys'
        );

        console.log('All data migrated successfully');
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await sourceClient.$disconnect();
        await targetClient.$disconnect();
    }
}

migrateData().then(() => console.log('successs'))