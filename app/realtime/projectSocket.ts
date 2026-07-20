import { io, Socket } from "socket.io-client";
import { BASE_URL, tokenStore } from "../../api/api";
import {
  queueProjectSync,
  markProjectNeedsSync,
} from "../sync/projectSyncEngine";

type ProjectChangedPayload = {
  projectId: string;
  syncVersion: number;
  updatedAt?: string;
  changedAt?: string;
  reason?: string;
};

let socket: Socket | null = null;
let joinedProjectIds: string[] = [];

function getSocketBaseUrl() {
  const baseUrl = String(BASE_URL || "").trim();

  return baseUrl
    .replace(/\/api\/v\d+\/?$/, "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

function normalizeProjectIds(projectIds: string[]) {
  return Array.from(new Set(projectIds.map(String).filter(Boolean)));
}

export async function connectProjectSocket(projectIds: string[] = []) {
  const token = await tokenStore.getToken();

  if (!token) {
    disconnectProjectSocket();
    return null;
  }

  joinedProjectIds = normalizeProjectIds(projectIds);

  if (socket?.connected) {
    if (joinedProjectIds.length > 0) {
      socket.emit("projects:join", joinedProjectIds);
    }

    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  console.log("[socket] connecting to", getSocketBaseUrl());

 socket = io(getSocketBaseUrl(), {
  transports: ["polling", "websocket"],
  auth: {
    token,
  },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
  reconnectionDelayMax: 10000,
  timeout: 20000,
});

  socket.on("connect", () => {
    console.log("[socket] connected", socket?.id);

    if (joinedProjectIds.length > 0) {
      socket?.emit("projects:join", joinedProjectIds);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected", reason);
  });

socket.on("connect_error", (error: any) => {
  console.log("[socket] connect error", {
    message: error?.message,
    description: error?.description,
    context: error?.context,
    url: getSocketBaseUrl(),
  });
});

  socket.on("project:changed", async (payload: ProjectChangedPayload) => {
    try {
      console.log("[socket] project changed", payload);

      if (!payload?.projectId) return;

      await queueProjectSync({
        projectId: payload.projectId,
        serverSyncVersion: payload.syncVersion,
        reason: payload.reason || "socket_project_changed",
      });
    } catch (error) {
      console.log("[socket] project sync failed", error);

      if (payload?.projectId) {
        await markProjectNeedsSync(payload.projectId);
      }
    }
  });

  return socket;
}

export function joinProjectRooms(projectIds: string[]) {
  joinedProjectIds = normalizeProjectIds(projectIds);

  if (socket?.connected && joinedProjectIds.length > 0) {
    socket.emit("projects:join", joinedProjectIds);
  }
}

export function disconnectProjectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  joinedProjectIds = [];
}