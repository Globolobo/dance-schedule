import { findClasses } from "./classes.dao";
import {
  DanceStyleFilter,
  DANCE_STYLE_MAP,
  SearchResponse,
} from "./classes.dto";

export const searchClasses = async (
  typeFilter: DanceStyleFilter
): Promise<SearchResponse> => {
  const where =
    typeFilter !== "any"
      ? { definition: { style: DANCE_STYLE_MAP[typeFilter] } }
      : {};

  const classes = await findClasses(where);

  return {
    classes,
    count: classes.length,
  };
};
