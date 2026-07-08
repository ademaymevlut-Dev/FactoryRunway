import * as React from "react";

import { cn } from "@/lib/utils";

function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "admin-form-control h-10 w-full min-w-0 appearance-none px-3 py-2 pr-10 leading-5 text-foreground outline-none disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
