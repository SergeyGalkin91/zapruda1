/** Called only by the existing disposable localhost PostgreSQL runner.
 * Four invented SQL identities; never a hosted project or signed JWT test. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function checkCommunityBoundaries({ sql, scalar, asUser, q, file, owner, outsider }) {
  const third = "00000000-0000-4000-8000-000000000002";
  const fourth = "00000000-0000-4000-8000-000000000004";
  await sql(`insert into auth.users values(${q(third)}),(${q(fourth)});
    insert into public.profiles values(${q(third)}),(${q(fourth)});`);
  const users = [owner, outsider, third, fourth];
  await sql(file("tests/unit/club_message_context.sql"));
  const a = randomUUID(),
    b = randomUUID();
  await sql(`insert into social_groups(id,name,owner_id) values(${q(a)},'Fixture A',${q(owner)}),(${q(b)},'Fixture B',${q(outsider)});
    insert into social_group_members(group_id,user_id,status) values
    (${q(a)},${q(owner)},'accepted'),(${q(b)},${q(outsider)},'accepted'),
    (${q(a)},${q(third)},'pending'),(${q(b)},${q(third)},'accepted'),
    (${q(a)},${q(fourth)},'declined'),(${q(b)},${q(fourth)},'accepted');
    insert into social_group_messages(group_id,user_id,body) values
    (${q(a)},${q(owner)},'Fixture A'),(${q(b)},${q(outsider)},'Fixture B');`);
  assert.equal(
    await scalar(asUser(owner, "select count(*) from social_group_messages")),
    2,
    "Historical vulnerability must reproduce",
  );
  await sql(file("staging/v076_club_message_membership_scope.sql"));
  assert.equal(await scalar(asUser(owner, "select count(*) from social_group_messages")), 1);
  await sql(
    asUser(
      owner,
      `insert into social_group_messages(group_id,user_id,body)values(${q(a)},${q(owner)},'Allowed')`,
    ),
  );
  await assert.rejects(
    sql(
      asUser(
        owner,
        `insert into social_group_messages(group_id,user_id,body)values(${q(b)},${q(owner)},'Forbidden')`,
      ),
    ),
    /row-level security/,
  );
  for (const uid of [outsider, third, fourth]) {
    assert.equal(
      await scalar(
        asUser(uid, `select count(*) from social_group_messages where group_id=${q(a)}`),
      ),
      0,
    );
    await assert.rejects(
      sql(
        asUser(
          uid,
          `insert into social_group_messages(group_id,user_id,body)values(${q(a)},${q(uid)},'Forbidden')`,
        ),
      ),
      /row-level security/,
    );
  }
  await assert.rejects(
    sql(`begin;set local role anon;select * from social_group_messages;commit;`),
    /permission denied/,
  );
  await assert.rejects(
    sql(
      asUser(
        owner,
        `insert into social_group_messages(group_id,user_id,body)values(${q(a)},${q(outsider)},'Spoofed')`,
      ),
    ),
    /row-level security/,
  );
  await sql(
    [
      "20261102_v071_meetups_DRAFT_REVIEW_BEFORE_APPLY.sql",
      "20261102_v071_meetup_integrity_hardening.sql",
      "20261102_v071_meetup_rpc_grant_hardening.sql",
      "20261102231917_meetup_table_privilege_hardening.sql",
    ]
      .map((p) => file("staging/" + p))
      .join("\n"),
  );
  const create = async () => {
    const id = randomUUID();
    await sql(
      asUser(
        owner,
        `insert into meetup_posts(id,owner_id,country_code,region_code,city_code,title)
      values(${q(id)},${q(owner)},'RU','QA','QA','Disposable PostgreSQL')`,
      ),
    );
    for (const uid of users.slice(1))
      await sql(
        asUser(uid, `insert into meetup_members(post_id,user_id)values(${q(id)},${q(uid)})`),
      );
    return id;
  };
  const change = (id, uid, status) =>
    `update meetup_members set status=${q(status)} where post_id=${q(id)} and user_id=${q(uid)}`;
  const baseline = await create();
  await sql(asUser(owner, change(baseline, outsider, "accepted")));
  await assert.rejects(
    sql(asUser(outsider, change(baseline, outsider, "declined"))),
    /MEETUP_ACCEPTED_IMMUTABLE/,
  );
  await sql(asUser(owner, `update meetup_posts set status='cancelled' where id=${q(baseline)}`));
  assert.equal(
    await scalar(asUser(outsider, `select meetup_is_accepted(${q(baseline)})`)),
    true,
    "Historical cancellation leak must reproduce",
  );
  await sql(file("staging/v076_meetup_leave_cancel.sql"));
  assert.equal(await scalar(asUser(outsider, `select meetup_is_accepted(${q(baseline)})`)), false);
  const races = [];
  for (let round = 0; round < 5; round++) {
    const id = await create();
    await sql(asUser(owner, change(id, outsider, "accepted")));
    await sql(
      asUser(
        owner,
        `insert into meetup_private_details(post_id,owner_id,private_place) values(${q(id)},${q(owner)},'Private fixture')`,
      ),
    );
    await sql(
      asUser(
        outsider,
        `insert into meetup_messages(post_id,sender_id,body) values(${q(id)},${q(outsider)},'History fixture')`,
      ),
    );
    assert.equal(
      await scalar(
        asUser(third, `select count(*) from meetup_private_details where post_id=${q(id)}`),
      ),
      0,
    );
    const result = await Promise.allSettled(
      [third, fourth].map((uid) => sql(asUser(owner, change(id, uid, "accepted")))),
    );
    assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
    const refused = result.find((r) => r.status === "rejected");
    assert.match(String(refused.reason), /MEETUP_FULL/);
    assert.equal(
      await scalar(
        `select count(*) from meetup_members where post_id=${q(id)} and status='accepted'`,
      ),
      3,
    );
    const winner = result[0].status === "fulfilled" ? third : fourth;
    const loser = winner === third ? fourth : third;
    await sql(asUser(winner, change(id, winner, "declined")));
    assert.equal(await scalar(asUser(owner, `select meetup_occupancy(${q(id)})`)), 2);
    assert.equal(
      await scalar(
        asUser(winner, `select count(*) from meetup_private_details where post_id=${q(id)}`),
      ),
      0,
    );
    await assert.rejects(
      sql(
        asUser(
          winner,
          `insert into meetup_messages(post_id,sender_id,body)values(${q(id)},${q(winner)},'Forbidden')`,
        ),
      ),
      /row-level security/,
    );
    await sql(asUser(winner, change(id, winner, "pending")));
    await assert.rejects(
      sql(asUser(winner, change(id, winner, "accepted"))),
      /MEETUP_ACCEPT_OWNER_ONLY/,
    );
    await sql(asUser(owner, change(id, loser, "accepted")));
    assert.equal(await scalar(asUser(owner, `select meetup_occupancy(${q(id)})`)), 3);
    await assert.rejects(sql(asUser(owner, change(id, winner, "accepted"))), /MEETUP_FULL/);
    await sql(asUser(owner, `update meetup_posts set status='cancelled' where id=${q(id)}`));
    assert.equal(await scalar(asUser(outsider, `select meetup_occupancy(${q(id)})`)), 0);
    for (const uid of users) {
      assert.equal(await scalar(asUser(uid, `select meetup_is_accepted(${q(id)})`)), false);
      assert.equal(
        await scalar(
          asUser(uid, `select count(*) from meetup_private_details where post_id=${q(id)}`),
        ),
        0,
      );
      assert.equal(
        await scalar(asUser(uid, `select count(*) from meetup_messages where post_id=${q(id)}`)),
        0,
      );
    }
    await assert.rejects(
      sql(asUser(owner, change(id, winner, "accepted"))),
      /MEETUP_ACCEPT_OWNER_ONLY/,
    );
    await assert.rejects(
      sql(asUser(owner, `update meetup_posts set status='open' where id=${q(id)}`)),
      /MEETUP_REOPEN_DENIED/,
    );
    assert.equal(await scalar(`select count(*) from meetup_messages where post_id=${q(id)}`), 1);
    await assert.rejects(
      sql(`begin; set local role anon;select * from meetup_private_details;commit;`),
      /permission denied/,
    );
    races.push({
      round,
      contenders: 2,
      admitted: 1,
      acceptedLimit: 3,
      leaveFreesSeat: true,
      cancellationRevokesAccess: true,
      historyPreserved: true,
    });
  }
  return {
    clubHistoricalLeakReproduced: true,
    clubAcceptedScope: true,
    pendingDeclinedOutsiderAnonDenied: true,
    meetupHistoricalLeaveAndCancellationDefectsReproduced: true,
    races,
    signedJWT: false,
    hosted: false,
  };
}
