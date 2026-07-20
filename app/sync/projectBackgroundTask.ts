import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { tokenStore } from "../../api/api";
import { syncAssignedProjectsFromApi } from "./projectSyncEngine";

export const PROJECT_BACKGROUND_SYNC_TASK = "project-background-sync-task";

TaskManager.defineTask(PROJECT_BACKGROUND_SYNC_TASK, async () => {
  try {
    const token = await tokenStore.getToken();

    if (!token) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    await syncAssignedProjectsFromApi();

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.log("[background-sync] failed", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerProjectBackgroundSync() {
  try {
    const status = await BackgroundTask.getStatusAsync();

    if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
      console.log("[background-sync] not available", status);
      return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      PROJECT_BACKGROUND_SYNC_TASK
    );

    if (isRegistered) {
      return true;
    }

    await BackgroundTask.registerTaskAsync(PROJECT_BACKGROUND_SYNC_TASK, {
      minimumInterval: 15,
    });

    console.log("[background-sync] registered");

    return true;
  } catch (error) {
    console.log("[background-sync] register failed", error);
    return false;
  }
}

export async function unregisterProjectBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      PROJECT_BACKGROUND_SYNC_TASK
    );

    if (!isRegistered) return;

    await BackgroundTask.unregisterTaskAsync(PROJECT_BACKGROUND_SYNC_TASK);

    console.log("[background-sync] unregistered");
  } catch (error) {
    console.log("[background-sync] unregister failed", error);
  }
}