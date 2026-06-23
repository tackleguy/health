import { redirect } from "next/navigation";

export default async function TrailDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/explore/trails/${id}`);
}
