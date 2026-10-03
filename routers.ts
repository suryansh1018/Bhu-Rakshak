import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { clearAdminSession, isAdminSession, setAdminSession, verifyAdminPassword } from "./adminAuth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createAlertSubscription,
  createIncidentReport,
  getAdminStats,
  listIncidentReports,
  listSignInEvents,
  recordSignInEvent,
  saveRiskSnapshots,
  updateIncidentStatus,
} from "./db";
import { getImdBulletins, getLiveCorridors } from "./liveData";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

const corridorId = z.enum(["nh10", "sohra", "nh13", "nh29", "nh37", "champhai", "lumding"]);
const assistantMessage = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2_000) });
const assistantLanguage = z.enum(["English", "Hindi", "Bengali", "Assamese"]);

function getAssistantText(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part): part is { type: "text"; text: string } => typeof part === "object" && part !== null && "text" in part && typeof part.text === "string")
    .map(part => part.text)
    .join("\n");
}

const adminSessionProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!isAdminSession(ctx.req)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearAdminSession(ctx.res, ctx.req);
      return { success: true } as const;
    }),
    adminLogin: publicProcedure.input(z.object({ password: z.string().min(1).max(128) })).mutation(({ ctx, input }) => {
      if (!verifyAdminPassword(input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect admin password" });
      }
      setAdminSession(ctx.res, ctx.req);
      return { success: true, role: "admin" as const };
    }),
    adminLogout: publicProcedure.mutation(({ ctx }) => {
      clearAdminSession(ctx.res, ctx.req);
      return { success: true } as const;
    }),
  }),
  admin: router({
    // This is a capability probe used by the login gate. It must not throw for
    // anonymous visitors because the public homepage and the admin sign-in
    // screen can both render without an admin cookie. Sensitive procedures
    // below remain protected by adminSessionProcedure.
    me: publicProcedure.query(({ ctx }) => isAdminSession(ctx.req) ? { authenticated: true, role: "admin" as const } : { authenticated: false as const, role: null }),
    stats: adminSessionProcedure.query(() => getAdminStats()),
    reports: adminSessionProcedure.query(() => listIncidentReports()),
    signIns: adminSessionProcedure.query(() => listSignInEvents()),
    updateReportStatus: adminSessionProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["received", "reviewing", "resolved"]) })).mutation(({ input }) => updateIncidentStatus(input.id, input.status)),
    summarizeReports: adminSessionProcedure.mutation(async () => {
      const reports = await listIncidentReports(60);
      if (!reports.length) return { summary: "No incident reports are available to prioritize yet.", items: [] };
      const reportText = reports.map(report => `Report ${report.id} | corridor: ${report.corridorId} | status: ${report.status} | GPS: ${report.latitude ?? "none"},${report.longitude ?? "none"} | description: ${report.description}`).join("\n");
      const response = await invokeLLM({
        maxTokens: 1_200,
        messages: [
          { role: "system", content: "You are an emergency operations analyst. Prioritize and categorize citizen incident reports for field teams. Use only the supplied report text. Do not invent facts. Return strict JSON matching the requested schema. Priority should reflect immediate danger, slope movement, falling rocks, blocked roads, or injuries; use low for informational reports. Categories: slope, road, rainfall, infrastructure, other." },
          { role: "user", content: reportText },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "incident_prioritization",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                items: { type: "array", items: { type: "object", properties: { id: { type: "integer" }, priority: { type: "string", enum: ["critical", "high", "medium", "low"] }, category: { type: "string", enum: ["slope", "road", "rainfall", "infrastructure", "other"] }, rationale: { type: "string" }, recommendedAction: { type: "string" } }, required: ["id", "priority", "category", "rationale", "recommendedAction"], additionalProperties: false } },
              },
              required: ["summary", "items"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices?.[0]?.message?.content;
      const raw = typeof content === "string" ? content : "";
      try {
        const parsed = JSON.parse(raw) as { summary: string; items: Array<{ id: number; priority: "critical" | "high" | "medium" | "low"; category: "slope" | "road" | "rainfall" | "infrastructure" | "other"; rationale: string; recommendedAction: string }> };
        return parsed;
      } catch {
        throw new Error("The AI prioritization response was not valid JSON");
      }
    }),
  }),
  monitor: router({
    corridors: publicProcedure.query(async () => {
      const corridors = await getLiveCorridors();
      void saveRiskSnapshots(corridors.map(item => ({
        corridorId: item.id,
        rainfall24h: item.rainfall24h,
        rainfall7d: item.rainfall7d,
        riskLevel: item.riskLevel,
        riskScore: item.riskScore,
        factorOfSafety: item.factorOfSafety,
        source: item.source,
        measuredAt: new Date(item.measuredAt),
      }))).catch(error => console.warn("[Monitor] Risk snapshot cache write skipped:", error));
      return {
        corridors,
        fetchedAt: new Date().toISOString(),
        sources: ["Open-Meteo", "Bhu-Rakshak risk model", "Sentinel-1 layer: connector-ready"],
        liveDataUnavailable: corridors.every(item => item.source.toLowerCase().includes("unavailable")),
      };
    }),
    bulletins: publicProcedure.query(async () => ({ bulletins: await getImdBulletins(), fetchedAt: new Date().toISOString() })),
    subscribe: publicProcedure.input(z.object({ phone: z.string().min(8).max(32), corridorId, channel: z.enum(["whatsapp", "sms"]).default("whatsapp") })).mutation(async ({ input }) => {
      const phone = input.phone.replace(/[^+\d]/g, "");
      if (phone.length < 8) throw new Error("Enter a valid mobile number");
      return createAlertSubscription({ ...input, phone });
    }),
    reportIncident: publicProcedure.input(z.object({
      corridorId,
      description: z.string().min(5).max(2_000),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      image: z.object({ filename: z.string().max(180), contentType: z.string().regex(/^image\/(jpeg|png|webp)$/), base64: z.string().max(10_000_000) }).optional(),
    })).mutation(async ({ input }) => {
      let imageKey: string | undefined;
      let imageUrl: string | undefined;
      if (input.image) {
        const safeFilename = input.image.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploaded = await storagePut(`incidents/${Date.now()}-${safeFilename}`, Buffer.from(input.image.base64, "base64"), input.image.contentType);
        imageKey = uploaded.key;
        imageUrl = uploaded.url;
      }
      return createIncidentReport({ corridorId: input.corridorId, description: input.description, latitude: input.latitude, longitude: input.longitude, imageKey, imageUrl });
    }),
  }),
  assistant: router({
    ask: publicProcedure.input(z.object({ messages: z.array(assistantMessage).min(1).max(12), language: assistantLanguage.default("English") })).mutation(async ({ input }) => {
      const corridors = await getLiveCorridors();
      const context = corridors.map(item => `${item.name} (${item.state}): ${item.riskLevel} risk, ${item.rainfall24h.toFixed(1)} mm/24h, lead window ${item.leadTime}, source ${item.source}`).join("\n");
      const response = await invokeLLM({
        maxTokens: 650,
        messages: [
          {
            role: "system",
            content: `You are Bhu-Rakshak Saathi, a calm, multilingual citizen safety assistant for Northeast India. Respond in ${input.language} unless the user clearly asks for another language. Give concise, actionable guidance about landslide risk, rainfall, travel planning, reporting incidents, emergency preparedness, and how to use this portal. Use only the corridor context below for current conditions. Never invent an official warning, road closure, rescue service, or precise forecast. If someone reports immediate danger, tell them to move away from slopes and call India's emergency number 112. You are not a replacement for official authorities or emergency services.\n\nCurrent corridor context:\n${context}`,
          },
          ...input.messages,
        ],
      });
      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error("The safety assistant did not return a response");
      return { answer: getAssistantText(content) };
    }),
  }),
});

export type AppRouter = typeof appRouter;
