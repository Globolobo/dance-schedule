import type { Prisma } from "@prisma/client";
import { prisma } from "../../client";
import {
  ClassInstanceWithDefinition,
  classInstanceIncludeDefinition,
} from "./classes.dto";

export const findClasses = async (
  where: Prisma.ClassInstanceWhereInput
): Promise<ClassInstanceWithDefinition[]> => {
  const instances = await prisma.classInstance.findMany({
    where,
    include: classInstanceIncludeDefinition,
    orderBy: {
      createdAt: "desc",
    },
  });

  return instances;
};
