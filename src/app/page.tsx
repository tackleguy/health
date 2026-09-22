import Link from "next/link";
import { getActivities, getWeeklyStats } from "@/lib/activities";
import { formatDistance, formatDuration } from "@/lib/gps";
import { ActivityListRow } from "@/components/activities/ActivityListRow";
import { getAuthUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const { user } = await getAuthUser();
  const [activities, stats] = await Promise.all([
    user ? getActivities(20) : Promise.resolve([]),
    user ? getWeeklyStats() : Promise.resolve(null),
  ]);
  return <div className="fieldbook-page">
    <header className="fieldbook-page-toolbar"><div><h1>Your time outside.</h1><p className="fieldbook-page-intro">Keep a record of the places you’ve been. Find the next one.</p></div><Link href="/record" className="btn-primary">Record activity</Link></header>
    {stats && stats.activityCount > 0 && <dl className="fieldbook-week"><div><dt>Outings this week</dt><dd>{stats.activityCount}</dd></div><div><dt>Distance</dt><dd>{formatDistance(stats.distanceM)}</dd></div><div><dt>Time outside</dt><dd>{formatDuration(stats.durationSec)}</dd></div><div><dt>Elevation gain</dt><dd>{stats.elevationFt.toLocaleString()} ft</dd></div></dl>}
    <div className="fieldbook-log-layout"><section><h2>Recent outings</h2><div className="mt-6 space-y-3">{!user ? <div className="fieldbook-empty"><h3>Your adventure log starts here.</h3><p>Sign in to save GPS tracks and revisit your hikes, runs, rides and ski days.</p><div className="fieldbook-actions"><Link href="/login" className="btn-primary">Sign in</Link><Link href="/signup" className="btn-ghost">Create account</Link></div></div> : !activities.length ? <div className="fieldbook-empty"><h3>No outings recorded yet.</h3><p>Start recording on your next outing, or add an activity you’ve already completed.</p><Link className="btn-ghost mt-6" href="/record/manual">Log an activity</Link></div> : activities.map(activity => <ActivityListRow key={activity.id} activity={activity} />)}</div></section>
      <aside className="fieldbook-context"><h2>Where to next?</h2><p>Choose a trail, prepare your equipment and keep your next trip together.</p><Link href="/plan" className="btn-primary">Plan a trip</Link><Link href="/explore/trails" className="fieldbook-text-link">Explore trails</Link></aside></div>
  </div>;
}
