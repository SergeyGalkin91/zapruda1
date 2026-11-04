import type { Database as ExistingDatabase } from "./types";
import type { Database as StagingDatabase } from "./staging.types";

type ExistingSchema = ExistingDatabase["public"];
type StagingSchema = StagingDatabase["public"];
type AddMissing<Current, Additional> = Current & Omit<Additional, keyof Current>;
type PrivacyTables = {
  report_photos: Omit<ExistingSchema["Tables"]["report_photos"], "Row" | "Insert" | "Update"> & {
    Row: ExistingSchema["Tables"]["report_photos"]["Row"] & {
      sanitized_path: string | null;
      sanitized_at: string | null;
    };
    Insert: ExistingSchema["Tables"]["report_photos"]["Insert"] & {
      sanitized_path?: string | null;
      sanitized_at?: string | null;
    };
    Update: ExistingSchema["Tables"]["report_photos"]["Update"] & {
      sanitized_path?: string | null;
      sanitized_at?: string | null;
    };
  };
};

/** Keep established contracts; add only new tables/RPCs from the staging snapshot. */
export type AppDatabase = Omit<ExistingDatabase, "public"> & {
  public: {
    [Kind in keyof ExistingSchema]: Kind extends "Tables"
      ? Omit<AddMissing<ExistingSchema[Kind], StagingSchema["Tables"]>, keyof PrivacyTables> &
          PrivacyTables
      : Kind extends keyof StagingSchema
        ? AddMissing<ExistingSchema[Kind], StagingSchema[Kind]>
        : ExistingSchema[Kind];
  };
};
