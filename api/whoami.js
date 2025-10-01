export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  return new Response(
    JSON.stringify({ ok: true, url: new URL(req.url).pathname }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}
