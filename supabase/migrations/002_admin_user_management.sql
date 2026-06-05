-- Allow admins to manage team user metadata from the dashboard.
-- RLS policies already restrict broad user updates to admins; this grant exposes
-- the required columns through the Data API.

grant update (
  name,
  title,
  profile_emoji,
  permission_role,
  is_team_member,
  is_active,
  updated_at
) on public.users to authenticated;
