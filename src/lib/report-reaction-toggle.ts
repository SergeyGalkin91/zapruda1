export type ReactionWriteResult = { error: { message: string } | null };
export type ExistingReaction = { id: string; reaction_type: string };
export type ReactionFindResult = {
  data: ExistingReaction[] | null;
  error: { message: string } | null;
};

export async function toggleReportReaction(
  type: string,
  find: () => PromiseLike<ReactionFindResult>,
  remove: (ids: string[]) => PromiseLike<ReactionWriteResult>,
  add: () => PromiseLike<ReactionWriteResult>,
): Promise<"added" | "removed" | "switched"> {
  const found = await find();
  if (found.error) throw new Error(found.error.message);
  const existing = found.data ?? [];
  if (!existing.length) {
    const inserted = await add();
    if (inserted.error) throw new Error(inserted.error.message);
    return "added";
  }
  const deleted = await remove(existing.map((row) => row.id));
  if (deleted.error) throw new Error(deleted.error.message);
  if (existing.every((row) => row.reaction_type === type)) return "removed";
  const inserted = await add();
  if (inserted.error) throw new Error(inserted.error.message);
  return "switched";
}
