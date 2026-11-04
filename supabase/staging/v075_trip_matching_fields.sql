-- STAGING ONLY: seven existing client fields absent from partner_trips.
-- Reviewed against 20261103000000 source + production column/CHECK metadata.
-- This is a new delta, NOT a replay of that migration's blocking/report policies.
-- No exact coordinates, payment fields, roles, bookings, or user data are copied.
alter table public.partner_trips
 add column experience_needed text not null default 'Любой уровень'
  check(experience_needed in('Любой уровень','Помогу новичку','Нужен опыт')),
 add column social_style text not null default 'Не важно'
  check(social_style in('Не важно','Общительная компания','Тихая рыбалка')),
 add column duration_hours integer check(duration_hours between 1 and 72),
 add column meeting_area text not null default '' check(char_length(meeting_area)<=180),
 add column gear_requirements text not null default '' check(char_length(gear_requirements)<=500),
 add column safety_notes text not null default '' check(char_length(safety_notes)<=500),
 add column boat_trip boolean not null default false;
