import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

// A simple in-memory database fallback to allow the application to run offline/sandbox
const inMemoryDB: {
  users: Record<string, any>;
  resumes: Record<string, any>;
  credits: Record<string, any>;
} = {
  users: {},
  resumes: {},
  credits: {}
};

// Seed default demo user
inMemoryDB.users["demo@fasthire.ai"] = {
  id: "demo-user-id",
  email: "demo@fasthire.ai",
  name: "Demo Candidate",
  createdAt: new Date(),
};
inMemoryDB.credits["demo-user-id"] = {
  id: "demo-credit-id",
  userId: "demo-user-id",
  freeUsed: 0,
  paidCredits: 5,
  resetAt: new Date(),
};

const prismaClientSingleton = () => {
  return new PrismaClient();
};

const realPrisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = realPrisma;
}

function createMockFallbackProxy(target: any, path: string[] = []): any {
  return new Proxy(target, {
    get(target, prop: string) {
      if (typeof prop === "symbol" || prop === "then" || prop === "catch") {
        return target[prop];
      }

      const nextPath = [...path, prop];

      if (["findUnique", "findMany", "create", "update", "delete", "upsert"].includes(prop)) {
        return async function (...args: any[]) {
          try {
            return await target[prop](...args);
          } catch (dbError: any) {
            logger.warn(`Prisma DB connection issue detected at ${nextPath.join(".")}. Using in-memory fallback.`, dbError.message);
            
            const model = nextPath[0].toLowerCase(); // "user", "resume", "credit"
            const operation = prop;
            const params = args[0] || {};

            if (model === "user") {
              if (operation === "findUnique") {
                const email = params.where?.email;
                const id = params.where?.id;
                let found = null;
                if (email) found = inMemoryDB.users[email];
                else if (id) found = Object.values(inMemoryDB.users).find((u: any) => u.id === id);
                if (found) {
                  let userCopy = { ...found };
                  if (params.include?.credit) {
                    userCopy.credit = inMemoryDB.credits[userCopy.id];
                  }
                  return userCopy;
                }
                return null;
              }
              if (operation === "create") {
                const data = params.data || {};
                const newUser = {
                  id: data.id || "demo-user-id",
                  email: data.email,
                  name: data.name || null,
                  createdAt: new Date(),
                };
                inMemoryDB.users[data.email] = newUser;
                if (data.credit?.create) {
                  inMemoryDB.credits[newUser.id] = {
                    id: "demo-credit-id",
                    userId: newUser.id,
                    freeUsed: data.credit.create.freeUsed || 0,
                    paidCredits: data.credit.create.paidCredits || 0,
                    resetAt: data.credit.create.resetAt || new Date(),
                  };
                }
                let returnedUser: any = { ...newUser };
                if (params.include?.credit) {
                  returnedUser.credit = inMemoryDB.credits[newUser.id];
                }
                return returnedUser;
              }
            }

            if (model === "credit") {
              if (operation === "create") {
                const data = params.data || {};
                const newCredit = {
                  id: "credit-" + Math.random().toString(36).substr(2, 9),
                  userId: data.userId,
                  freeUsed: data.freeUsed ?? 0,
                  paidCredits: data.paidCredits ?? 0,
                  resetAt: data.resetAt || new Date(),
                };
                inMemoryDB.credits[data.userId] = newCredit;
                return newCredit;
              }
              if (operation === "update") {
                const userId = params.where?.userId;
                const credit = inMemoryDB.credits[userId];
                if (credit) {
                  const data = params.data || {};
                  if (data.freeUsed?.increment) credit.freeUsed += data.freeUsed.increment;
                  else if (data.freeUsed !== undefined) credit.freeUsed = data.freeUsed;
                  if (data.paidCredits?.decrement) credit.paidCredits -= data.paidCredits.decrement;
                  if (data.resetAt) credit.resetAt = data.resetAt;
                  return credit;
                }
                return null;
              }
            }

            if (model === "resume") {
              if (operation === "create") {
                const data = params.data || {};
                const newResume = {
                  id: "resume-" + Math.random().toString(36).substr(2, 9),
                  ...data,
                  createdAt: new Date(),
                };
                inMemoryDB.resumes[newResume.id] = newResume;
                return newResume;
              }
              if (operation === "findUnique") {
                const id = params.where?.id;
                return inMemoryDB.resumes[id] || null;
              }
              if (operation === "findMany") {
                const userId = params.where?.userId;
                return Object.values(inMemoryDB.resumes).filter((r: any) => r.userId === userId);
              }
            }

            return null;
          }
        };
      }

      return createMockFallbackProxy(target[prop], nextPath);
    }
  });
}

export const prisma = createMockFallbackProxy(realPrisma);

