export async function POST() {
  return Response.json({ error: "Payments disabled" }, { status: 410 });
}
