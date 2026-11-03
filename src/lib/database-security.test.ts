// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  actAsFixture,
  applySqlFile,
  createIsolatedPostgres,
  fixtureUsers as users,
} from "../test/isolated-postgres";

let db: PGlite;
const competition = "10000000-0000-4000-8000-000000000001";
const otherCompetition = "10000000-0000-4000-8000-000000000002";
const team = "20000000-0000-4000-8000-000000000001";
const result = "30000000-0000-4000-8000-000000000001";
const replacement = "90000000-0000-4000-8000-000000000001";
const post = "40000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  db = await createIsolatedPostgres();
  for (const path of [
    "migrations/20261102160000_team_competitions.sql",
    "migrations/20261102162000_competition_team_limit_for_update_p0.sql",
    "migrations/20261102170000_ai_daily_advices_grok.sql",
    "migrations/20261102171000_ai_daily_advice_atomic_claim.sql",
    "migrations/20261102174000_ai_daily_advice_lease_expiry_guard.sql",
    "staging/20261102_v071_meetups_DRAFT_REVIEW_BEFORE_APPLY.sql",
    "staging/20261102_v071_meetup_integrity_hardening.sql",
    "staging/20261102_v071_meetup_rpc_grant_hardening.sql",
    "migrations/20261102231910_competition_state_integrity.sql",
    "staging/20261102231917_meetup_table_privilege_hardening.sql",
  ])
    await applySqlFile(db, path);
}, 30000);

beforeEach(async () => {
  await db.exec("begin");
  await db.query(
    `insert into public.competitions(id,organizer_id,title,starts_at,ends_at,status,max_teams)
    values($1,$2,'Offline competition',now(),now()+interval '1 day','open',3)`,
    [competition, users.owner],
  );
  await db.query(
    `insert into public.competition_teams(id,competition_id,captain_id,name)
    values($1,$2,$3,'Fixture team')`,
    [team, competition, users.captain],
  );
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  if (db) await db.close();
});

async function insertResult(status = "submitted") {
  return db.query(
    `insert into public.competition_results(id,competition_id,team_id,submitted_by,status)
    values($1,$2,$3,$4,$5) returning status`,
    [result, competition, team, users.captain, status],
  );
}

describe("Competition authorization and state (isolated PostgreSQL, no JWT)", () => {
  it("can reapply both corrective migrations without changing fixture rows", async () => {
    await applySqlFile(db, "migrations/20261102231910_competition_state_integrity.sql");
    await applySqlFile(db, "staging/20261102231917_meetup_table_privilege_hardening.sql");
    expect(
      (await db.query("select id from public.competition_teams where id=$1", [team])).rows,
    ).toHaveLength(1);
  });
  it.each(["accepted", "rejected"])(
    "captain cannot self-moderate an INSERT as %s",
    async (status) => {
      await actAsFixture(db, users.captain);
      await expect(insertResult(status)).rejects.toMatchObject({ code: "42501" });
    },
  );

  it("captain submits and organizer accepts the result", async () => {
    await actAsFixture(db, users.captain);
    await insertResult();
    await actAsFixture(db, users.owner);
    const { rows } = await db.query(
      "update public.competition_results set status='accepted' where id=$1 returning status",
      [result],
    );
    expect(rows).toEqual([{ status: "accepted" }]);
  });

  it("organizer can disqualify and reinstate a team", async () => {
    await actAsFixture(db, users.owner);
    await db.query("update public.competition_teams set status='disqualified' where id=$1", [team]);
    const { rows } = await db.query(
      "update public.competition_teams set status='registered' where id=$1 returning status",
      [team],
    );
    expect(rows).toEqual([{ status: "registered" }]);
  });

  it("captain cannot undo organizer disqualification", async () => {
    await db.query("update public.competition_teams set status='disqualified' where id=$1", [team]);
    await actAsFixture(db, users.captain);
    await expect(
      db.query("update public.competition_teams set status='registered' where id=$1", [team]),
    ).rejects.toThrow(/DISQUALIFICATION/);
  });

  it.each(["id", "created_at"])("team %s is immutable", async (field) => {
    await actAsFixture(db, users.captain);
    const value = field === "id" ? replacement : "2000-01-01T00:00:00Z";
    await expect(
      db.query(`update public.competition_teams set ${field}=$1 where id=$2`, [value, team]),
    ).rejects.toThrow(/IMMUTABLE/);
  });

  it.each(["id", "submitted_by", "created_at"])(
    "result %s is immutable during moderation",
    async (field) => {
      await insertResult();
      await actAsFixture(db, users.owner);
      const value =
        field === "created_at"
          ? "2000-01-01T00:00:00Z"
          : field === "submitted_by"
            ? users.outsider
            : replacement;
      await expect(
        db.query(`update public.competition_results set ${field}=$1 where id=$2`, [value, result]),
      ).rejects.toThrow(/IMMUTABLE/);
    },
  );

  it.each(["finished", "cancelled"])(
    "cannot re-register a withdrawn team in %s competition",
    async (status) => {
      await db.query("update public.competition_teams set status='withdrawn' where id=$1", [team]);
      await db.query("update public.competitions set status=$1 where id=$2", [status, competition]);
      await actAsFixture(db, users.owner);
      await expect(
        db.query("update public.competition_teams set status='registered' where id=$1", [team]),
      ).rejects.toThrow(/REGISTRATION_CLOSED/);
    },
  );

  it("captain cannot rejoin after the competition finishes", async () => {
    await db.query("update public.competition_teams set status='withdrawn' where id=$1", [team]);
    await db.query("update public.competitions set status='finished' where id=$1", [competition]);
    await actAsFixture(db, users.captain);
    await expect(
      db.query("update public.competition_teams set status='registered' where id=$1", [team]),
    ).rejects.toThrow(/REGISTRATION_CLOSED/);
  });

  it.each(["withdrawn", "disqualified"])(
    "captain cannot create a team already marked %s",
    async (status) => {
      await actAsFixture(db, users.outsider);
      await expect(
        db.query(
          "insert into public.competition_teams(competition_id,captain_id,name,status) values($1,$2,'Invalid state team',$3)",
          [competition, users.outsider, status],
        ),
      ).rejects.toMatchObject({ code: "42501" });
    },
  );

  it("cannot shrink capacity below already registered teams", async () => {
    await db.query(
      `insert into public.competition_teams(competition_id,captain_id,name) values($1,$2,'Second team'),($1,$3,'Third team')`,
      [competition, users.outsider, users.fourth],
    );
    await actAsFixture(db, users.owner);
    await expect(
      db.query("update public.competitions set max_teams=2 where id=$1", [competition]),
    ).rejects.toThrow(/CAPACITY_BELOW_REGISTERED/);
  });

  it("sequential inserts still enforce the final seat (not a concurrent race)", async () => {
    await db.query("update public.competitions set max_teams=2 where id=$1", [competition]);
    await actAsFixture(db, users.outsider);
    await db.query(
      "insert into public.competition_teams(competition_id,captain_id,name) values($1,$2,'Second team')",
      [competition, users.outsider],
    );
    await actAsFixture(db, users.fourth);
    await expect(
      db.query(
        "insert into public.competition_teams(competition_id,captain_id,name) values($1,$2,'Third team')",
        [competition, users.fourth],
      ),
    ).rejects.toThrow(/COMPETITION_FULL/);
  });

  it("outsider cannot alter a submitted result", async () => {
    await insertResult();
    await actAsFixture(db, users.outsider);
    const { rows } = await db.query(
      "update public.competition_results set status='accepted' where id=$1 returning id",
      [result],
    );
    expect(rows).toEqual([]);
  });

  it("rejects a result tied to another competition's team", async () => {
    await db.query(
      `insert into public.competitions(id,organizer_id,title,starts_at,ends_at,status)
      values($1,$2,'Other competition',now(),now()+interval '1 day','open')`,
      [otherCompetition, users.owner],
    );
    await actAsFixture(db, users.captain);
    await expect(
      db.query(
        `insert into public.competition_results(competition_id,team_id,submitted_by)
      values($1,$2,$3)`,
        [otherCompetition, team, users.captain],
      ),
    ).rejects.toThrow(/MISMATCH/);
  });
});

async function seedMeetup() {
  await actAsFixture(db, users.owner);
  await db.query(
    `insert into public.meetup_posts(id,owner_id,country_code,region_code,city_code,title)
    values($1,$2,'RU','test-region','test-city','Offline meetup')`,
    [post, users.owner],
  );
  await db.query(
    `insert into public.meetup_private_details(post_id,owner_id,private_place,latitude,longitude)
    values($1,$2,'Offline private fixture',0,0)`,
    [post, users.owner],
  );
  await db.query(
    "insert into public.meetup_messages(post_id,sender_id,body) values($1,$2,'Private fixture message')",
    [post, users.owner],
  );
}

describe("Meetup privacy and privileges (isolated PostgreSQL, no JWT)", () => {
  it("keeps pending user's access away from private details and messages", async () => {
    await seedMeetup();
    await actAsFixture(db, users.captain);
    await db.query("insert into public.meetup_members(post_id,user_id) values($1,$2)", [
      post,
      users.captain,
    ]);
    expect((await db.query("select * from public.meetup_private_details")).rows).toEqual([]);
    expect((await db.query("select * from public.meetup_messages")).rows).toEqual([]);
  });

  it("allows private details and messages only after owner acceptance", async () => {
    await seedMeetup();
    await actAsFixture(db, users.captain);
    await db.query("insert into public.meetup_members(post_id,user_id) values($1,$2)", [
      post,
      users.captain,
    ]);
    await actAsFixture(db, users.owner);
    await db.query(
      "update public.meetup_members set status='accepted' where post_id=$1 and user_id=$2",
      [post, users.captain],
    );
    await actAsFixture(db, users.captain);
    expect(
      (await db.query("select private_place from public.meetup_private_details")).rows,
    ).toHaveLength(1);
    expect((await db.query("select body from public.meetup_messages")).rows).toHaveLength(1);
  });

  it("prevents a pending participant from accepting themselves", async () => {
    await seedMeetup();
    await actAsFixture(db, users.captain);
    await db.query("insert into public.meetup_members(post_id,user_id) values($1,$2)", [
      post,
      users.captain,
    ]);
    await expect(
      db.query(
        "update public.meetup_members set status='accepted' where post_id=$1 and user_id=$2",
        [post, users.captain],
      ),
    ).rejects.toThrow(/OWNER_ONLY/);
  });

  it.each(["meetup_posts", "meetup_members", "meetup_private_details", "meetup_messages"])(
    "does not grant authenticated destructive privileges on %s",
    async (table) => {
      const { rows } = await db.query(
        `select has_table_privilege('authenticated',$1,'TRUNCATE') as truncate,
        has_table_privilege('authenticated',$1,'DELETE') as delete,
        has_table_privilege('authenticated',$1,'TRIGGER') as trigger`,
        ["public." + table],
      );
      expect(rows).toEqual([{ truncate: false, delete: false, trigger: false }]);
    },
  );

  it("does not expose internal trigger functions as callable RPCs", async () => {
    const { rows } =
      await db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.prorettype='trigger'::regtype
      and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))`);
    expect(rows).toEqual([]);
  });
});

type Claim = { ok: boolean; id: string; lease_token?: string; reason?: string; answer?: string };
async function claimAdvice() {
  const { rows } = await db.query<{ claim: Claim }>(
    "select public.claim_ai_daily_advice_slot($1,date '2026-11-03','Offline fixture',3) as claim",
    [users.owner],
  );
  return rows[0].claim;
}
async function completeAdvice(claim: Claim, token: string | null = claim.lease_token ?? null) {
  const { rows } = await db.query<{ completion: { ok: boolean; reason?: string } }>(
    `select public.complete_ai_daily_advice_slot($1,$2,true,'Valid offline fixture answer','offline-model','') as completion`,
    [claim.id, token],
  );
  return rows[0].completion;
}

describe("AI lease enforcement (isolated PostgreSQL, no JWT)", () => {
  it("clients cannot directly execute claim or completion RPCs", async () => {
    const { rows } =
      await db.query(`select has_function_privilege('authenticated','public.claim_ai_daily_advice_slot(uuid,date,text,integer)','EXECUTE') as claim,
      has_function_privilege('authenticated','public.complete_ai_daily_advice_slot(uuid,uuid,boolean,text,text,text)','EXECUTE') as completion`);
    expect(rows).toEqual([{ claim: false, completion: false }]);
  });

  it("denies a second claim while the first lease is held", async () => {
    await actAsFixture(db, users.owner, "service_role");
    expect((await claimAdvice()).ok).toBe(true);
    expect(await claimAdvice()).toMatchObject({ ok: false, reason: "lease_held" });
  });

  it("stores one answer and returns it on the next daily claim", async () => {
    await actAsFixture(db, users.owner, "service_role");
    const claim = await claimAdvice();
    expect(await completeAdvice(claim)).toMatchObject({ ok: true });
    expect(await claimAdvice()).toMatchObject({
      ok: false,
      reason: "already_used",
      answer: "Valid offline fixture answer",
    });
  });

  it("rejects completion with a null token", async () => {
    await actAsFixture(db, users.owner, "service_role");
    expect(await completeAdvice(await claimAdvice(), null)).toMatchObject({
      ok: false,
      reason: "lease_mismatch",
    });
  });

  it("rejects a replayed completion", async () => {
    await actAsFixture(db, users.owner, "service_role");
    const claim = await claimAdvice();
    await completeAdvice(claim);
    expect(await completeAdvice(claim)).toMatchObject({ ok: false, reason: "lease_mismatch" });
  });

  it("rejects an expired lease", async () => {
    await actAsFixture(db, users.owner, "service_role");
    const claim = await claimAdvice();
    await db.query(
      "update public.ai_daily_advices set lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",
      [claim.id],
    );
    expect(await completeAdvice(claim)).toMatchObject({ ok: false, reason: "lease_expired" });
  });
});
