// (app)/FolderAndAssetScreen.tsx
import { useLocalSearchParams } from "expo-router";
import FolderAndAssetScreen from "../components/FolderAndAssetScreen";

export default function FolderAndAssetRoute() {
  const { projectId, projectName, offlineMode } = useLocalSearchParams<{
    projectId: string;
    projectName: string;
    offlineMode?: string;
  }>();

  return (
    <FolderAndAssetScreen
      route={{
        params: {
          projectId: projectId ?? "",
          projectName: projectName ?? "",
          offlineMode: offlineMode === "true",
        },
      }}
    />
  );
}