import * as DocumentPicker from "expo-document-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { LocalFile } from "./types";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const LONG_SIDE = 2048;

/** Lets the user pick up to `limit` photos, resized to a 2048 px long side and re-encoded as JPEG. */
export async function pickPhotos(limit: number): Promise<LocalFile[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, limit).map(resizePhoto));
}

async function resizePhoto(asset: ImagePicker.ImagePickerAsset): Promise<LocalFile> {
  const context = ImageManipulator.manipulate(asset.uri);
  const { width, height } = asset;
  if (width && height && Math.max(width, height) > LONG_SIDE) {
    context.resize(width >= height ? { width: LONG_SIDE } : { height: LONG_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: saved.uri, name: `photo-${Date.now()}.jpg`, type: "image/jpeg" };
}

/** Picks a PDF, JPG or PNG document of at most 5 MB. Throws with a readable message otherwise. */
export async function pickDocument(): Promise<LocalFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/jpeg", "image/png"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const file = result.assets[0]!;
  if (file.size && file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That file is larger than 5 MB. Choose a smaller PDF, JPG or PNG.");
  }
  return { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" };
}
