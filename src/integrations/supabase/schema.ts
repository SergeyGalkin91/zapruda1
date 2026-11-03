import type { Database as ExistingDatabase } from "./types";
import type { Database as StagingDatabase } from "./staging.types";

type ExistingSchema = ExistingDatabase["public"];
type StagingSchema = StagingDatabase["public"];
type AddMissing<Current, Additional> = Current & Omit<Additional, keyof Current>;

/** Keep established contracts; add only new tables/RPCs from the staging snapshot. */
export type AppDatabase = Omit<ExistingDatabase, "public"> & {
  public: {
    [Kind in keyof ExistingSchema]: Kind extends keyof StagingSchema
      ? AddMissing<ExistingSchema[Kind], StagingSchema[Kind]>
      : ExistingSchema[Kind];
  };
};
