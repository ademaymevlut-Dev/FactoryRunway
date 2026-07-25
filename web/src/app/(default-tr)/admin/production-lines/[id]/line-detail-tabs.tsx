"use client";

import type { ReactNode } from "react";
import { Coins, Gauge, ImageIcon, Layers3, Users } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LineDetailTabs({
  basics,
  capacity,
  staff,
  costs,
  images,
}: {
  basics: ReactNode;
  capacity: ReactNode;
  staff: ReactNode;
  costs: ReactNode;
  images: ReactNode;
}) {
  return (
    <Tabs defaultValue="basics">
      <TabsList className="h-auto w-full flex-wrap justify-start rounded-xl border border-border bg-card p-2">
        <TabsTrigger className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary" value="basics">
          <Layers3 />
          Ana Bilgiler
        </TabsTrigger>
        <TabsTrigger className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary" value="capacity">
          <Gauge />
          Kapasite & Alan
        </TabsTrigger>
        <TabsTrigger className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary" value="staff">
          <Users />
          Personel Rolleri
        </TabsTrigger>
        <TabsTrigger className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary" value="costs">
          <Coins />
          Maliyetler
        </TabsTrigger>
        <TabsTrigger className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary" value="images">
          <ImageIcon />
          Görseller
        </TabsTrigger>
      </TabsList>
      <TabsContent className="mt-3" value="basics">{basics}</TabsContent>
      <TabsContent className="mt-3" value="capacity">{capacity}</TabsContent>
      <TabsContent className="mt-3" value="staff">{staff}</TabsContent>
      <TabsContent className="mt-3" value="costs">{costs}</TabsContent>
      <TabsContent className="mt-3" value="images">{images}</TabsContent>
    </Tabs>
  );
}
