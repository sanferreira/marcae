import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

const MAX_DATA_URI_LENGTH = 1_200_000;

type PickImageOptions = {
  aspect?: [number, number];
  quality?: number;
};

async function pickImage({ aspect = [1, 1], quality = 0.6 }: PickImageOptions = {}): Promise<string | null> {
  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permita acesso à galeria para escolher uma foto.");
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect,
    quality,
    base64: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  if (asset.uri?.startsWith("data:")) {
    if (asset.uri.length > MAX_DATA_URI_LENGTH) {
      throw new Error("A imagem ficou grande demais. Escolha uma foto menor.");
    }
    return asset.uri;
  }

  if (!asset.base64) {
    throw new Error("Não foi possível processar a imagem escolhida.");
  }

  const dataUri = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
  if (dataUri.length > MAX_DATA_URI_LENGTH) {
    throw new Error("A imagem ficou grande demais. Escolha uma foto menor.");
  }

  return dataUri;
}

export async function pickAvatarImage(): Promise<string | null> {
  return pickImage({ aspect: [1, 1], quality: 0.6 });
}

export async function pickServiceImage(): Promise<string | null> {
  return pickImage({ aspect: [4, 3], quality: 0.65 });
}
