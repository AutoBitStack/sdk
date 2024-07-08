import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import "dotenv/config";

const client = createServerClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_ANON_KEY ?? "",
  {
    cookies: {
      getAll() {
        return parseCookieHeader("");
      },
      setAll() {},
    },
  }
);

export const insertHub = async (
  orderId: string,
  jobId: string,
  user: string,
  typeProduct: string
) => {
  await client.from("hub_main").insert({
    order_id: orderId,
    user: user,
    job_id: jobId,
    type_product: typeProduct,
  });
};

export const insertStatus = async (orderId: string, tx_hash: string) => {
  await client.from("hub_status").insert({
    order_id: orderId,
    tx_hash: tx_hash,
  });
};

export const getJobKeyFromOrderId = async (orderId: string) => {
  const { data } = await client
    .from("hub_main")
    .select("job_id")
    .eq("order_id", orderId)
    .single();
  return data;
};
