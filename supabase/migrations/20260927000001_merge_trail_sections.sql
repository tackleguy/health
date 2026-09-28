-- Merge connected, same-named OpenStreetMap trail sections into one trail each and correct
-- imported lengths. Each merged section is kept in trail_segments so the full trail can be drawn,
-- and so re-imports of a merged section resolve to its trail instead of creating a duplicate.

create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.trails_20260927 as
  select * from public.trails where official_source = 'OpenStreetMap';

alter table public.trail_segments add column if not exists source_external_id text;
create index if not exists trail_segments_source_external_idx
  on public.trail_segments (data_source_id, source_external_id)
  where source_external_id is not null;

create or replace function public.merge_trail_sections()
returns table (merged_trails integer, removed_trails integer, corrected_lengths integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_merged integer := 0;
  v_removed integer := 0;
  v_corrected integer := 0;
begin
  -- Sections of one trail: same park and normalized name, lines within ~150 m (0.0015°) of each other.
  create temp table _members on commit drop as
  with candidates as (
    select t.id,
           t.park_id,
           btrim(lower(regexp_replace(t.trail_name, '[^a-zA-Z0-9]+', ' ', 'g'))) as name_key,
           t.geometry::geometry as geom
      from trails t
     where t.official_source = 'OpenStreetMap'
       and t.geometry is not null
  ),
  named as (
    select * from candidates
     where name_key not in ('', 'unnamed', 'unnamed trail', 'unknown', 'trail', 'path', 'no name', 'none')
  ),
  clustered as (
    select n.*,
           ST_ClusterDBSCAN(n.geom, eps := 0.0015, minpoints := 1)
             over (partition by n.park_id, n.name_key) as grp
      from named n
  ),
  sized as (
    select c.*,
           count(*) over (partition by c.park_id, c.name_key, c.grp) as members,
           first_value(c.id) over (
             partition by c.park_id, c.name_key, c.grp
             order by ST_Length(c.geom::geography) desc, c.id
           ) as canonical_id
      from clustered c
  )
  select id, canonical_id from sized where members > 1;

  -- A member that was merged before already has its sections in trail_segments; otherwise the row itself is one section.
  create temp table _parts on commit drop as
    select m.canonical_id, s.name, s.geometry, s.data_source_id, s.source_external_id, s.confidence_score
      from _members m
      join trail_segments s on s.trail_id = m.id
    union all
    select m.canonical_id, t.trail_name, t.geometry, t.data_source_id, t.source_external_id, t.confidence_score
      from _members m
      join trails t on t.id = m.id
     where not exists (select 1 from trail_segments s where s.trail_id = m.id);

  delete from trail_segments where trail_id in (select id from _members);

  insert into trail_segments (trail_id, segment_index, name, geometry, length_miles, data_source_id, source_external_id, confidence_score)
  select canonical_id,
         (row_number() over (partition by canonical_id order by ST_Length(geometry) desc) - 1)::integer,
         name,
         geometry,
         round((ST_Length(geometry) / 1609.344)::numeric, 3),
         data_source_id,
         source_external_id,
         confidence_score
    from _parts;

  -- Repoint everything attached to a merged-away row to the surviving trail.
  update trailheads     set trail_id = m.canonical_id from _members m where trailheads.trail_id = m.id and m.id <> m.canonical_id;
  update campsites      set trail_id = m.canonical_id from _members m where campsites.trail_id = m.id and m.id <> m.canonical_id;
  update water_sources  set trail_id = m.canonical_id from _members m where water_sources.trail_id = m.id and m.id <> m.canonical_id;
  update viewpoints     set trail_id = m.canonical_id from _members m where viewpoints.trail_id = m.id and m.id <> m.canonical_id;
  update activities     set trail_id = m.canonical_id from _members m where activities.trail_id = m.id and m.id <> m.canonical_id;
  update route_imports  set trail_id = m.canonical_id from _members m where route_imports.trail_id = m.id and m.id <> m.canonical_id;
  update trail_source_records set trail_id = m.canonical_id from _members m where trail_source_records.trail_id = m.id and m.id <> m.canonical_id;
  update trail_photos   set trail_id = m.canonical_id from _members m where trail_photos.trail_id = m.id and m.id <> m.canonical_id;
  update restrictions   set trail_id = m.canonical_id from _members m where restrictions.trail_id = m.id and m.id <> m.canonical_id;
  update canonical_trails set merged_trail_id = m.canonical_id from _members m where canonical_trails.merged_trail_id = m.id and m.id <> m.canonical_id;
  -- One review per user per trail: a user's review of another section only moves if they haven't reviewed the surviving trail.
  update reviews r set trail_id = m.canonical_id
    from _members m
   where r.trail_id = m.id and m.id <> m.canonical_id
     and not exists (select 1 from reviews x where x.trail_id = m.canonical_id and x.user_id = r.user_id);

  -- trails.geometry holds a single LineString: the longest continuous line of the merged sections.
  -- Length counts the union of all sections, so overlapping sections are measured once.
  with merged as (
    select s.trail_id, ST_UnaryUnion(ST_Collect(s.geometry::geometry)) as u
      from trail_segments s
     where s.trail_id in (select canonical_id from _members)
     group by s.trail_id
  ),
  main as (
    select m.trail_id, m.u,
           (select d.geom from ST_Dump(ST_LineMerge(m.u)) d order by ST_Length(d.geom::geography) desc limit 1) as line
      from merged m
  )
  update trails t
     set geometry = main.line::geography,
         length_miles = greatest(0.01, round((ST_Length(main.u::geography) / 1609.344)::numeric, 2)),
         start_latitude = ST_Y(ST_StartPoint(main.line)),
         start_longitude = ST_X(ST_StartPoint(main.line)),
         end_latitude = ST_Y(ST_EndPoint(main.line)),
         end_longitude = ST_X(ST_EndPoint(main.line)),
         latitude = ST_Y(ST_StartPoint(main.line)),
         longitude = ST_X(ST_StartPoint(main.line)),
         updated_at = now()
    from main
   where t.id = main.trail_id;
  get diagnostics v_merged = row_count;

  delete from trails where id in (select id from _members where id <> canonical_id);
  get diagnostics v_removed = row_count;

  -- Single-section imports keep a reported length only when it agrees with the mapped line.
  update trails t
     set length_miles = greatest(0.01, round((ST_Length(t.geometry) / 1609.344)::numeric, 2)),
         updated_at = now()
   where t.official_source = 'OpenStreetMap'
     and t.geometry is not null
     and not exists (select 1 from trail_segments s where s.trail_id = t.id)
     and ST_Length(t.geometry) > 0
     and (t.length_miles * 1609.344 / ST_Length(t.geometry) not between 0.67 and 1.5);
  get diagnostics v_corrected = row_count;

  return query select v_merged, v_removed, v_corrected;
end;
$$;

revoke execute on function public.merge_trail_sections() from public, anon, authenticated;
grant execute on function public.merge_trail_sections() to service_role;

-- Trail detail includes every mapped section so merged trails draw in full.
create or replace function public.get_trail_detail(p_trail_id uuid)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'geometry', public.geography_to_geojson(t.geometry),
    'segments', (
      select jsonb_agg(public.geography_to_geojson(s.geometry) order by s.segment_index)
        from public.trail_segments s
       where s.trail_id = t.id and s.geometry is not null
    ),
    'elevation_profile', t.elevation_profile,
    'start_latitude', t.start_latitude,
    'start_longitude', t.start_longitude,
    'end_latitude', t.end_latitude,
    'end_longitude', t.end_longitude,
    'elevation_loss_ft', t.elevation_loss_ft,
    'highest_point_ft', t.highest_point_ft,
    'lowest_point_ft', t.lowest_point_ft,
    'trail_type', t.trail_type,
    'surface', t.surface,
    'allows_hiking', t.allows_hiking,
    'allows_backpacking', t.allows_backpacking,
    'allows_biking', t.allows_biking,
    'allows_horseback', t.allows_horseback,
    'allows_dogs', t.allows_dogs,
    'seasonal_information', t.seasonal_information,
    'official_source', t.official_source,
    'confidence_score', t.confidence_score
  )
  from public.trails t
  where t.id = p_trail_id;
$function$;

select * from public.merge_trail_sections();
