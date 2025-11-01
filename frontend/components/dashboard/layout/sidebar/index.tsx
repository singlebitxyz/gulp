"use client";

import * as React from "react";
import { Bot, Home } from "lucide-react";
import { MainSectionSidebar } from "@/components/dashboard/layout/sidebar/main-section";
import { UserPopover } from "@/components/dashboard/layout/user-popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// Gulp navigation structure
const navData = {
  navMain: [
    {
      title: "Bots",
      url: "/dashboard/bots",
      icon: Bot,
      isActive: true,
      items: [
        {
          title: "All Bots",
          url: "/dashboard/bots",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Gulp</span>
            <span className="truncate text-xs text-muted-foreground">
              AI Assistant Platform
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <MainSectionSidebar items={navData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <UserPopover />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
