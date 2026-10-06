interface FormErrorSummaryProps {
  errors: string[];
}

export default function FormErrorSummary({
  errors,
}: FormErrorSummaryProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <div className="flex gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
          !
        </div>

        <div>
          <p className="text-sm font-bold text-red-800">
            Please correct the following:
          </p>

          <ul className="mt-2 space-y-1">
            {errors.map((error, index) => (
              <li
                key={`${error}-${index}`}
                className="text-xs text-red-700"
              >
                • {error}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}