const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking DB records...");
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { resumes: true }
        }
      }
    });
    console.log("=== Users ===");
    console.log(users);

    const resumes = await prisma.resume.findMany({
      take: 5,
      orderBy: { createdAt: "desc" }
    });
    console.log("=== Latest Resumes ===");
    console.log(resumes.map(r => ({
      id: r.id,
      userId: r.userId,
      jobTitle: r.jobTitle,
      createdAt: r.createdAt,
      originalTextLength: r.originalText?.length,
      optimizedTextLength: r.optimizedText?.length
    })));
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
