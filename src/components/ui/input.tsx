import * as React from "react";

import { cn } from "./utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "file:text-gray-900 placeholder:text-gray-400 selection:bg-gray-100 selection:text-gray-900 flex h-9 w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-1 text-base shadow-sm transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-gray-900 focus-visible:ring-1 focus-visible:ring-gray-900",
          "aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
