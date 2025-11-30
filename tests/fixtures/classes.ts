import { PrismaClient, DanceStyle, DanceLevel, UserRole } from "@prisma/client";

export interface CreateTestUserParams {
  email?: string;
  name?: string;
  role?: UserRole;
}

export async function createTestUser(
  prisma: PrismaClient,
  params: CreateTestUserParams = {}
): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}> {
  const {
    email = `user-${crypto.randomUUID()}@test.com`,
    name = "Test User",
    role = UserRole.STUDENT,
  } = params;

  return await prisma.user.create({
    data: {
      email,
      name,
      role,
    },
  });
}

export interface CreateTestInstructorParams {
  email?: string;
  name?: string;
}

export interface CreateTestClassParams {
  title?: string;
  description?: string;
  style?: DanceStyle;
  level?: DanceLevel;
  maxSpots?: number;
  durationMin?: number;
  instructorId?: string | null;
}

export async function createTestInstructor(
  prisma: PrismaClient,
  params: CreateTestInstructorParams = {}
): Promise<{ id: string; email: string; name: string }> {
  const {
    email = `instructor-${crypto.randomUUID()}@test.com`,
    name = "Test Instructor",
  } = params;

  const instructor = await prisma.user.create({
    data: {
      email,
      name,
      role: UserRole.INSTRUCTOR,
    },
  });

  return {
    id: instructor.id,
    email: instructor.email,
    name: instructor.name,
  };
}

export async function createTestClass(
  prisma: PrismaClient,
  params: CreateTestClassParams = {}
): Promise<{
  id: string;
  title: string;
  description: string | null;
  style: DanceStyle;
  level: DanceLevel;
  maxSpots: number;
  durationMin: number;
  instructorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}> {
  const {
    title = "Test Class",
    description = "Test description",
    style = DanceStyle.SALSA,
    level = DanceLevel.OPEN,
    maxSpots = 20,
    durationMin = 60,
    instructorId = null,
  } = params;

  let finalInstructorId = instructorId;
  if (!finalInstructorId) {
    const defaultInstructor = await createTestInstructor(prisma);
    finalInstructorId = defaultInstructor.id;
  }

  const classDef = await prisma.classDefinition.create({
    data: {
      title,
      description,
      style,
      level,
      maxSpots,
      durationMin,
      instructorId: finalInstructorId,
    },
  });

  return classDef;
}

export async function createTestClassInstance(
  prisma: PrismaClient,
  params: CreateTestClassParams & {
    startTime?: Date;
    endTime?: Date;
    bookedCount?: number;
  } = {}
): Promise<{
  id: string;
  definitionId: string;
  startTime: Date;
  endTime: Date;
  bookedCount: number;
  createdAt: Date;
  updatedAt: Date;
}> {
  const {
    startTime = new Date("2024-01-01T10:00:00Z"),
    endTime = new Date("2024-01-01T11:00:00Z"),
    bookedCount = 0,
    ...classParams
  } = params;

  const classDef = await createTestClass(prisma, classParams);

  const instance = await prisma.classInstance.create({
    data: {
      definitionId: classDef.id,
      startTime,
      endTime,
      bookedCount,
    },
  });

  return instance;
}
