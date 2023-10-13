import { LayoutProps } from "$fresh/server.ts";
import { getUser } from "../lib/sessions.ts";

export default function Layout(props: LayoutProps) {
  const { Component, state } = props;
  const color = getUser(props) ? "bg-lime-300" : "";
  return (
    <div class="px-4 py-8 mx-auto ">
      <div class="max-w-screen-lg mx-auto flex flex-col items-center justify-center">
        <div class={`flex flex-row px-8 py-4 mb-4 rounded-lg ${color}`}>
          <img
            class="my-6 mx-4"
            src="/fresh-logo.svg"
            width="128"
            height="128"
            alt="the Fresh logo: a sliced lemon dripping with juice"
          />
          <span class="text-6xl font-bold flex items-center">+</span>
          <img
            class="mt-8 mb-4 mx-4"
            src="/openid-logo.svg"
            height="96"
            alt="the OpenID logo"
          />
        </div>
        <Component />
      </div>
    </div>
  );
}
