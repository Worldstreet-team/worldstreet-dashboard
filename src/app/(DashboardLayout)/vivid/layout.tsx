"use client";

import React from "react";

/**
 * Custom layout for the /vivid chat page.
 * Renders children directly without the dashboard sidebar/header,
 * giving the chat a full-screen experience.
 * Auth providers are still inherited from the parent (DashboardLayout) group.
 */
export default function VividLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
