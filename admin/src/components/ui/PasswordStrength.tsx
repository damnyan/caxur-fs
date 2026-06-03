import { Check, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
  value: string
  isFocused?: boolean
}

export function PasswordStrength({ value = "", isFocused = false }: PasswordStrengthProps) {
  // Define the criteria
  const criteria = [
    {
      id: "length",
      label: "At least 12 characters",
      met: value.length >= 12,
    },
    {
      id: "lowercase",
      label: "At least one lowercase letter (a-z)",
      met: /[a-z]/.test(value),
    },
    {
      id: "uppercase",
      label: "At least one uppercase letter (A-Z)",
      met: /[A-Z]/.test(value),
    },
    {
      id: "number",
      label: "At least one number (0-9)",
      met: /[0-9]/.test(value),
    },
    {
      id: "special",
      label: "At least one special character (e.g. !@#$%)",
      met: /[^a-zA-Z0-9]/.test(value),
    },
  ]

  const metCount = criteria.filter((c) => c.met).length

  // Determine strength label, color, and number of active segments
  let strengthLabel = "Too short"
  let strengthColor = "bg-gray-200 dark:bg-gray-800"
  let textColor = "text-gray-400 dark:text-gray-600"
  let filledSegments = 0

  if (value.length > 0) {
    if (metCount <= 2) {
      strengthLabel = "Weak"
      strengthColor = "bg-red-500"
      textColor = "text-red-500"
      filledSegments = 1
    } else if (metCount === 3) {
      strengthLabel = "Fair"
      strengthColor = "bg-amber-500"
      textColor = "text-amber-500"
      filledSegments = 2
    } else if (metCount === 4) {
      strengthLabel = "Good"
      strengthColor = "bg-emerald-400"
      textColor = "text-emerald-500"
      filledSegments = 3
    } else if (metCount === 5) {
      strengthLabel = "Strong"
      strengthColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
      textColor = "text-emerald-500"
      filledSegments = 4
    }
  }

  // Progressive check: Only show the panel when the field has focus or has some text input
  const showPanel = isFocused || value.length > 0

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        showPanel ? "max-h-[260px] opacity-100 mt-3" : "max-h-0 opacity-0 pointer-events-none"
      )}
    >
      <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm space-y-3 shadow-inner">
        {/* Strength Meter Header */}
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-gray-500 dark:text-gray-400">Password strength:</span>
          <span className={cn("transition-colors duration-300 font-bold", textColor)}>
            {strengthLabel}
          </span>
        </div>

        {/* Segmented Strength Bar */}
        <div className="grid grid-cols-4 gap-1.5 h-1">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                index < filledSegments ? strengthColor : "bg-gray-100 dark:bg-gray-800/50"
              )}
            />
          ))}
        </div>

        {/* Progressive Requirements Checklist */}
        <ul className="space-y-1.5 pt-1">
          {criteria.map((criterion) => (
            <li
              key={criterion.id}
              className="flex items-center gap-2 text-xs transition-colors duration-300"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-4 h-4 rounded-full border transition-all duration-300",
                  criterion.met
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 scale-100"
                    : "border-gray-300 dark:border-gray-700 text-gray-300 dark:text-gray-700"
                )}
              >
                {criterion.met ? (
                  <Check className="w-2.5 h-2.5 stroke-[3px]" />
                ) : (
                  <Circle className="w-1.5 h-1.5 fill-current" />
                )}
              </div>
              <span
                className={cn(
                  "transition-colors duration-300",
                  criterion.met ? "text-emerald-600 dark:text-emerald-500 font-medium" : "text-gray-500 dark:text-gray-400"
                )}
              >
                {criterion.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
