import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

interface BaseProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
}

type InputProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    textarea?: false;
  };

type TextareaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    textarea: true;
  };

type Props = InputProps | TextareaProps;

const AuthField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  Props
>(function AuthField(props, ref) {
  const {
    label,
    error,
    required,
    hint,
    className = "",
  } = props;

  const commonClass = `
    w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900
    outline-none transition
    placeholder:text-slate-400
    ${
      error
        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
        : "border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
    }
    ${className}
  `;

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {props.textarea ? (
        (() => {
          const {
            label: _label,
            error: _error,
            required: _required,
            hint: _hint,
            className: _className,
            textarea: _textarea,
            ...textareaProps
          } = props;

          return (
            <textarea
              {...textareaProps}
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={`${commonClass} min-h-[110px] resize-y py-3`}
            />
          );
        })()
      ) : (
        (() => {
          const {
            label: _label,
            error: _error,
            required: _required,
            hint: _hint,
            className: _className,
            textarea: _textarea,
            ...inputProps
          } = props;

          return (
            <input
              {...inputProps}
              ref={ref as React.Ref<HTMLInputElement>}
              className={`${commonClass} h-12`}
            />
          );
        })()
      )}

      {error ? (
        <p
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600"
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold">
            !
          </span>

          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

AuthField.displayName = "AuthField";

export default AuthField;