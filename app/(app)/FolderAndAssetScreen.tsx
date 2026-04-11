// (app)/FolderAndAssetScreen.tsx  ← NEW FILE (this becomes the actual route)
import { useLocalSearchParams } from "expo-router";
import FolderAndAssetScreen from "../components/FolderAndAssetScreen";

export default function FolderAndAssetRoute() {
  const { projectId, projectName } = useLocalSearchParams<{
    projectId: string;
    projectName: string;
  }>();

  return (
    <FolderAndAssetScreen
      route={{
        params: {
          projectId: projectId ?? "",
          projectName: projectName ?? "",
        },
      }}
    />
  );
}