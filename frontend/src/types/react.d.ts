import type { ReactNode } from "react";

declare global {
  namespace React {
    type ReactNodeAlias = ReactNode;
  }
}

export {};
