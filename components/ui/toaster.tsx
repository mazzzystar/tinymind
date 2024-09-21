"use client";

import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { BsCheckCircleFill } from "react-icons/bs";
import { MdError } from "react-icons/md";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const { variant } = props;
        return (
          <Toast key={id} {...props}>
            <div className="gap-2">
              <div className="flex gap-2">
                {variant === "destructive" ? (
                  <MdError />
                ) : (
                  <BsCheckCircleFill className="fill-emerald-500" />
                )}

                {title && <ToastTitle>{title}</ToastTitle>}
              </div>
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
