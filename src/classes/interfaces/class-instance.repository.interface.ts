import type { Prisma } from "@prisma/client";
import type { ClassInstanceWithDefinition } from "../dto/repository.dto";

export interface IClassInstanceRepository {
  findById(id: string): Promise<ClassInstanceWithDefinition | null>;
  findMany(
    where: Prisma.ClassInstanceWhereInput
  ): Promise<ClassInstanceWithDefinition[]>;
}
