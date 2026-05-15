// app/admin/layout.tsx (ou votre layout principal)
"use client";

import { useSidebar } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ArticleModalProvider } from "@/context/ArticleModalContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <ThemeProvider>
      <ArticleModalProvider>
        <div className="h-screen overflow-hidden xl:flex">
          <AppSidebar />
          <Backdrop />

          <div
            className={`flex flex-col flex-1 h-screen transition-all duration-300 ease-in-out ${mainContentMargin}`}
          >
            <AppHeader />
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {children}
            </div>
          </div>
        </div>
      </ArticleModalProvider>
    </ThemeProvider>
  );
}