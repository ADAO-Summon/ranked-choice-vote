async function getRandomRow(
    prisma: any,
    model: any,
    whereCondition?: any
) {
    // Get the total count of rows that match the where condition
    const count = await prisma[model].count({
        where: whereCondition as any // Type assertion needed due to Prisma's complex types
    });

    if (count === 0) {
        return null; // No matching rows
    }

    // Generate a random skip value
    const randomSkip = Math.floor(Math.random() * count);

    // Fetch a random row that matches the where condition
    const randomRow = await prisma[model].findFirst({
        where: whereCondition as any, // Type assertion needed due to Prisma's complex types
        skip: randomSkip,
    });

    return randomRow;
}

