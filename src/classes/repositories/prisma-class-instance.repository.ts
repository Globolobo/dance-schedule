import type { Prisma } from "@prisma/client";
import { prisma } from "../../client";
import type { IClassInstanceRepository } from "../interfaces/class-instance.repository.interface";
import type { ClassInstanceWithDefinition } from "../dto/repository.dto";
import { classInstanceIncludeDefinition } from "../dto/repository.dto";

export class PrismaClassInstanceRepository implements IClassInstanceRepository {
  async findById(id: string): Promise<ClassInstanceWithDefinition | null> {
    const instance = await prisma.classInstance.findUnique({
      where: { id },
      include: classInstanceIncludeDefinition,
    });

    return instance;
  }

  async findMany(
    where: Prisma.ClassInstanceWhereInput
  ): Promise<ClassInstanceWithDefinition[]> {
    const instances = await prisma.classInstance.findMany({
      where,
      include: classInstanceIncludeDefinition,
      orderBy: {
        createdAt: "desc",
      },
    });

    return instances;
  }
}
