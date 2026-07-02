import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const baseUrl = process.env.ADMIN_VERIFY_BASE_URL || "http://127.0.0.1:3000";
let cookieHeader = "";

const client = createTRPCClient({
  links: [
    httpBatchLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      fetch: async (input, init) => {
        const response = await fetch(input, {
          ...(init ?? {}),
          headers: {
            ...Object.fromEntries(new Headers(init?.headers ?? {}).entries()),
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
          },
        });

        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
          cookieHeader = setCookie.split(";")[0] ?? cookieHeader;
        }

        return response;
      },
    }),
  ],
});

async function main() {
  const before = await client.signage.adminStatus.query();
  if (before.authenticated !== false) {
    throw new Error(`Expected unauthenticated before login, got ${JSON.stringify(before)}`);
  }

  await client.signage.adminUnlock.mutate({ password: "mf1count" });

  const after = await client.signage.adminStatus.query();
  if (after.authenticated !== true) {
    throw new Error(`Expected authenticated after login, got ${JSON.stringify(after)}`);
  }

  const stats = await client.signage.getAdminHourlyStats.query({});
  if (!stats || !Array.isArray(stats.devices) || !Array.isArray(stats.hourlyRows)) {
    throw new Error(`Unexpected stats payload: ${JSON.stringify(stats)}`);
  }

  console.log(JSON.stringify({ before, after, selectedDateKey: stats.selectedDateKey, deviceCount: stats.devices.length }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
