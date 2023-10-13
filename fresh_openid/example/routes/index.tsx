import { PageProps } from "$fresh/server.ts";
import { getUser } from "../lib/sessions.ts";

const btnClass =
  "bg-gray-600 hover:bg-[#ff6200] text-center text-white font-bold py-2 px-4 rounded";

export default function Home(props: PageProps) {
  const user = getUser(props);
  const welcome = user
    ? `Welcome to deno-openid, ${user.name}!`
    : "Welcome to deno-openid!";

  return (
    <>
      <h1 class="text-4xl font-bold mb-8">{welcome}</h1>
      {user && (
        <a href="/signout" class={btnClass}>
          Sign out
        </a>
      )}
      {!user && (
        <>
          <p class="my-4">
            Use OpenID to sign in or up with your provider of choice
          </p>
          <div class="flex flex-col gap-4">
            <a
              href="/openid/signin?provider=google"
              class={btnClass}
            >
              Google
            </a>
            <a
              href="/openid/signin?provider=facebook"
              class={btnClass}
            >
              Facebook
            </a>
          </div>
        </>
      )}
    </>
  );
}
