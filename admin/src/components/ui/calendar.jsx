import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous:
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 rounded-md hover:bg-accent",
        button_next:
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 rounded-md hover:bg-accent",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 h-9 text-[0.8rem] font-normal flex items-center justify-center",
        week: "flex w-full mt-2",
        day: "h-9 w-9 p-0 text-center text-sm relative",
        day_button:
          "h-9 w-9 p-0 font-normal rounded-md hover:bg-accent aria-selected:opacity-100",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
