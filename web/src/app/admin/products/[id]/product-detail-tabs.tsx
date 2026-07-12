"use client";

import type { ReactNode } from "react";
import {
  FileText,
  ImageIcon,
  Layers3,
  Palette,
  Route,
  SwatchBook,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function ProductDetailTabs({
  card,
  colors,
  definitions,
  images,
  main,
  route,
}: {
  card: ReactNode;
  colors: ReactNode;
  definitions: ReactNode;
  images: ReactNode;
  main: ReactNode;
  route: ReactNode;
}) {
  return (
    <Tabs defaultValue="main">
      <TabsList className="h-auto w-full flex-wrap justify-start rounded-xl border border-border bg-card p-2">
        <TabsTrigger
          className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary"
          value="main"
        >
          <Layers3 />
          Ana Bilgiler
        </TabsTrigger>
        <TabsTrigger
          className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary"
          value="definitions"
        >
          <FileText />
          Tanımlamalar
        </TabsTrigger>
        <TabsTrigger
          className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary"
          value="route"
        >
          <Route />
          Üretim Rotası
        </TabsTrigger>
        <TabsTrigger
          className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary"
          value="colors"
        >
          <SwatchBook />
          Renkler
        </TabsTrigger>
        <TabsTrigger
          className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary"
          value="images"
        >
          <ImageIcon />
          Görseller
        </TabsTrigger>
        <TabsTrigger
          className="flex-none rounded-lg px-4 py-2.5 data-active:bg-primary/10 data-active:text-primary"
          value="card"
        >
          <Palette />
          Kart Tasarımı
        </TabsTrigger>
      </TabsList>
      <TabsContent className="mt-3" value="main">
        {main}
      </TabsContent>
      <TabsContent className="mt-3" value="definitions">
        {definitions}
      </TabsContent>
      <TabsContent className="mt-3" value="route">
        {route}
      </TabsContent>
      <TabsContent className="mt-3" value="colors">
        {colors}
      </TabsContent>
      <TabsContent className="mt-3" value="images">
        {images}
      </TabsContent>
      <TabsContent className="mt-3" value="card">
        {card}
      </TabsContent>
    </Tabs>
  );
}
