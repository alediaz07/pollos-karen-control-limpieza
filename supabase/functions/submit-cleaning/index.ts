import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const allowedOrigins = new Set(["https://alediaz07.github.io", "http://localhost:5173", "http://127.0.0.1:5173"]);
const jsonHeaders = (origin: string | null) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://alediaz07.github.io",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
});
Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const headers = jsonHeaders(origin);
  if (origin && !allowedOrigins.has(origin)) return new Response(JSON.stringify({ error: "Origen no permitido" }), { status: 403, headers });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405, headers });
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 300000) return new Response(JSON.stringify({ error: "Solicitud demasiado grande" }), { status: 413, headers });
  try {
    const body = await request.json();
    const { area, employeeId, tasks, signature } = body ?? {};
    if (typeof area !== "string" || typeof employeeId !== "string" || !Array.isArray(tasks) ||
        tasks.length > 20 || !tasks.every((t: unknown) => typeof t === "string" && t.length < 100) ||
        typeof signature !== "string" || signature.length > 250000 || !signature.startsWith("data:image/png;base64,")) {
      return new Response(JSON.stringify({ error: "Datos de limpieza inválidos" }), { status: 400, headers });
    }
    const url = Deno.env.get("SUPABASE_URL");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !secret) throw Error("Missing server configuration");
    const db = createClient(url, secret, { auth: { persistSession: false } });
    const { data, error } = await db.rpc("submit_cleaning", {
      p_area: area, p_employee_id: employeeId, p_tasks: tasks, p_signature: signature,
    });
    if (error) {
      console.error("Cleaning submission:", error.code);
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
    }
    return new Response(JSON.stringify({ id: data }), { status: 201, headers });
  } catch (error) {
    console.error("Unexpected cleaning submission error", error);
    return new Response(JSON.stringify({ error: "No se pudo guardar el registro" }), { status: 500, headers });
  }
});
