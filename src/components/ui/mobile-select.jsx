import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/**
 * MobileSelect Component
 * 
 * Responsive Select that uses:
 * - Bottom Sheet Drawer on mobile (<768px)
 * - Popover Select on desktop (>=768px)
 * 
 * Drop-in replacement for Select component
 */
export function MobileSelect({
  value,
  onValueChange,
  children,
  placeholder,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isMobile) {
    // Desktop: Use standard Select
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    );
  }

  // Mobile: Use Drawer
  const selectedLabel = React.Children.toArray(children)
    .filter(child => child.props.value === value)
    .map(child => child.props.children)[0] || placeholder;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-left hover:bg-slate-50 disabled:opacity-50"
      >
        {selectedLabel}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2 max-h-96 overflow-y-auto">
            {React.Children.toArray(children).map(child => (
              <button
                key={child.props.value}
                onClick={() => {
                  onValueChange(child.props.value);
                  setOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-md text-left text-sm transition-colors ${
                  value === child.props.value
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-slate-50 text-slate-900 hover:bg-slate-100"
                }`}
              >
                {child.props.children}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}