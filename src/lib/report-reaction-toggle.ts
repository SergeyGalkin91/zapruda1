export type ReactionWriteResult = { error: { message: string } | null };
export type ExistingReaction = { id: string };
export type ReactionFindResult = { data: ExistingReaction[] | null; error: { message: string } | null };

export async function toggleReportReaction(
  find: () => PromiseLike<ReactionFindResult>,
  remove: (ids: string[]) => PromiseLike<ReactionWriteResult>,
  add: () => PromiseLike<ReactionWriteResult>,
): Promise<"added" | "removed"> {
  const found = await find();
  if (found.error) throw new Error(found.error.message);
  const ids = (found.data ?? []).map(row => row.id);
  const result = ids.length ? await remove(ids) : await add();
  if (result.error) throw new Error(result.error.message);
  return ids.length ? "removed" : "added";
}
