export default {
  async fetch(req, env) {
    return new Response('dashboard: hello', { status: 200 });
  }
};
