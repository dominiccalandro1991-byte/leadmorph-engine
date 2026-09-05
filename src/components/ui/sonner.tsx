import { Toaster as Sonner } from "sonner";

function Toaster() {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "bg-surface-2 text-fg border-border",
          description: "text-muted",
        },
      }}
    />
  );
}

export { Toaster };
