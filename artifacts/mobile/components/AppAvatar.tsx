import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  imageUri?: string | null;
  fallback: string;
  size: number;
  backgroundColor: string;
  textColor: string;
  fontSize?: number;
};

export function AppAvatar({ imageUri, fallback, size, backgroundColor, textColor, fontSize }: Props) {
  const radius = size / 2;

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor }}
        contentFit="cover"
        transition={120}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius, backgroundColor }]}>
      <Text style={[styles.text, { color: textColor, fontSize: fontSize ?? Math.round(size * 0.36) }]}>{fallback}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  text: {
    fontFamily: "Inter_700Bold",
  },
});
