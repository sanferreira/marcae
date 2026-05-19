import { Platform, type TextInputProps } from "react-native";

type InputKind = "date" | "time" | "email" | "phone" | "number" | "decimal" | "password" | "text";

export function typedInputProps(kind: InputKind): TextInputProps & Record<string, unknown> {
  const common: TextInputProps & Record<string, unknown> = {};

  if (kind === "email") {
    common.keyboardType = "email-address";
    common.autoCapitalize = "none";
    common.autoCorrect = false;
    common.textContentType = "emailAddress";
  } else if (kind === "phone") {
    common.keyboardType = "phone-pad";
    common.textContentType = "telephoneNumber";
    common.maxLength = 15;
  } else if (kind === "number") {
    common.keyboardType = "number-pad";
  } else if (kind === "decimal") {
    common.keyboardType = "decimal-pad";
  } else if (kind === "date" || kind === "time") {
    common.keyboardType = "numbers-and-punctuation";
    common.maxLength = kind === "date" ? 10 : 5;
  } else if (kind === "password") {
    common.secureTextEntry = true;
    common.textContentType = "password";
    common.autoCapitalize = "none";
  }

  if (Platform.OS === "web") {
    if (kind === "date") {
      common.type = "date";
      common.inputMode = "numeric";
    } else if (kind === "time") {
      common.type = "time";
      common.inputMode = "numeric";
    } else if (kind === "email") {
      common.type = "email";
      common.autoComplete = "email";
    } else if (kind === "phone") {
      common.type = "tel";
      common.autoComplete = "tel";
    } else if (kind === "number") {
      common.type = "number";
      common.inputMode = "numeric";
      common.min = 0;
    } else if (kind === "decimal") {
      common.type = "text";
      common.inputMode = "decimal";
    } else if (kind === "password") {
      common.type = "password";
      common.autoComplete = "current-password";
    }
  }

  return common;
}
