import { Router, Request, Response } from "express";
import config from "../config/index";
import {
  addSkybox,
  getSkybox,
  updateSkyboxStatus,
  getAllSkyboxes,
  addToAgentMemory,
  getAgentMemory,
  setCurrentEnvironment,
  type SkyboxRecord,
} from "./skyboxStore";

const router = Router();

const SKYBOX_API_BASE = "https://backend.blockadelabs.com/api/v1";

async function skyboxFetch(path: string, options: RequestInit = {}) {
  return fetch(`${SKYBOX_API_BASE}${path}`, {
    ...options,
    headers: {
      "x-api-key": config.skyboxApiKey,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });
}

// ── GET /skybox/styles — cached for 10 minutes ──────────────────────────

let stylesCache: { data: unknown; cachedAt: number } | null = null;
const STYLES_CACHE_TTL = 10 * 60 * 1000;

router.get("/styles", async (_req: Request, res: Response): Promise<void> => {
  if (stylesCache && Date.now() - stylesCache.cachedAt < STYLES_CACHE_TTL) {
    res.json(stylesCache.data);
    return;
  }
  try {
    const resp = await skyboxFetch("/skybox/styles");
    const data = await resp.json();
    stylesCache = { data, cachedAt: Date.now() };
    res.json(data);
  } catch (err) {
    console.error("[Skybox] Styles error:", err);
    res.status(500).json({ error: "Failed to fetch styles" });
  }
});

// ── POST /skybox/generate ───────────────────────────────────────────────

router.post("/generate", async (req: Request, res: Response): Promise<void> => {
  const { prompt, skybox_style_id, enhance_prompt, agentId, spatialContext } =
    req.body;

  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  if (!config.skyboxApiKey) {
    res.status(503).json({ error: "Skybox API key not configured" });
    return;
  }

  try {
    const resp = await skyboxFetch("/skybox", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        skybox_style_id: skybox_style_id ?? 2,
        enhance_prompt: enhance_prompt ?? true,
      }),
    });
    const data = await resp.json();

    if (!data.id) {
      console.error("[Skybox] Unexpected response:", data);
      res.status(502).json({ error: "Unexpected response from Skybox API" });
      return;
    }

    const record: SkyboxRecord = {
      id: data.id,
      agentId: agentId ?? "unknown",
      prompt,
      styleId: skybox_style_id ?? 2,
      status: "pending",
      fileUrl: null,
      thumbUrl: null,
      depthMapUrl: null,
      createdAt: Date.now(),
      completedAt: null,
      spatialContext: spatialContext ?? prompt,
    };
    addSkybox(record);

    if (agentId) {
      addToAgentMemory(agentId, record);
      setCurrentEnvironment(agentId, record.id);
    }

    res.status(201).json({ success: true, skybox: record, raw: data });
  } catch (err) {
    console.error("[Skybox] Generate error:", err);
    res.status(500).json({ error: "Failed to generate skybox" });
  }
});

// ── GET /skybox/status/:id ──────────────────────────────────────────────

router.get("/status/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid skybox ID" });
    return;
  }

  try {
    const resp = await skyboxFetch(`/imagine/requests/${id}`);
    const data = await resp.json();
    const request = data.request ?? data;

    if (request.status === "complete") {
      updateSkyboxStatus(id, {
        status: "complete",
        fileUrl: request.file_url ?? null,
        thumbUrl: request.thumb_url ?? null,
        depthMapUrl: request.depth_map_url ?? null,
        completedAt: Date.now(),
      });
    } else if (request.status) {
      updateSkyboxStatus(id, { status: request.status });
    }

    const stored = getSkybox(id);
    res.json({ skybox: stored, raw: data });
  } catch (err) {
    console.error("[Skybox] Status error:", err);
    res.status(500).json({ error: "Failed to check skybox status" });
  }
});

// ── GET /skybox/history ─────────────────────────────────────────────────

router.get("/history", (_req: Request, res: Response): void => {
  res.json({ skyboxes: getAllSkyboxes() });
});

// ── GET /skybox/memory/:agentId ─────────────────────────────────────────

router.get("/memory/:agentId", (req: Request, res: Response): void => {
  const { agentId } = req.params;
  const memory = getAgentMemory(agentId);
  res.json({ memory });
});

export default router;
