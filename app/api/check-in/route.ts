export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}))
  return new Response(JSON.stringify({ ok: true, received: payload }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
