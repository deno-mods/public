import { Handlers, PageProps } from "$fresh/server.ts";
import { sessions } from "../lib/sessions.ts";
import { users } from "../lib/users.ts";

export const handler: Handlers = {
  async GET(_req, ctx) {
    return await ctx.render();
  },

  async POST(req, ctx) {
    const form = await req.formData();
    const name = form.get("name")?.toString();

    const session = sessions.read(ctx);
    if (!name || !session?.tokens) {
      throw new Error("Invalid data to signup user");
    }

    const { iss, sub } = session.tokens.id_token.payload;
    const user = { name, iss: iss!, sub: sub! };
    users.set(user);
    session.user = user;
    session.tokens = undefined;
    sessions.update(ctx, session);

    return new Response(null, {
      status: 303, // See Other
      headers: {
        location: "/",
      },
    });
  },
};

export default function Signup(props: PageProps) {
  const session = sessions.read(props);
  if (session?.user || !session?.tokens) {
    return new Response(null, {
      status: 303, // See Other
      headers: {
        location: "/",
      },
    });
  }

  const btnClass =
    "bg-gray-600 hover:bg-[#ff6200] text-center text-white font-bold py-2 px-4 rounded mt-4";
  const id = session?.tokens?.id_token.payload;
  return (
    <>
      <h1 class="text-4xl font-bold mb-8">Sign up</h1>
      <form method="post">
        <p>What would you like to be called?</p>
        <p>
          <input
            type="name"
            name="name"
            value={id?.given_name || id?.name || ""}
            placeholder="Your name"
            required
          />
        </p>
        <button class={btnClass} type="submit">
          Subscribe
        </button>
      </form>
    </>
  );
}
