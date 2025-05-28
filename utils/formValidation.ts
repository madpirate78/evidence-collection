// utils/formValidation.ts - Client-side validation utilities
import { z } from "zod";

/**
 * Utility to add real-time validation to form inputs
 */
export class FormValidator {
  private schema: z.ZodSchema<any>;
  private form: HTMLFormElement;
  private errors: Map<string, string> = new Map();

  constructor(form: HTMLFormElement, schema: z.ZodSchema<any>) {
    this.form = form;
    this.schema = schema;
    this.attachListeners();
  }

  private attachListeners() {
    // Add validation to all form inputs
    const inputs = this.form.querySelectorAll("input, select, textarea");

    inputs.forEach((input) => {
      if (input instanceof HTMLElement) {
        // Validate on blur for better UX
        input.addEventListener("blur", (e) => {
          this.validateField(e.target as HTMLInputElement);
        });

        // Clear errors on input for immediate feedback
        input.addEventListener("input", (e) => {
          this.clearFieldError(e.target as HTMLInputElement);
        });
      }
    });

    // Validate entire form on submit
    this.form.addEventListener("submit", (e) => {
      if (!this.validateForm()) {
        e.preventDefault();
        this.focusFirstError();
      }
    });
  }

  private validateField(input: HTMLInputElement): boolean {
    const fieldName = input.name;
    const value = this.getFieldValue(input);

    try {
      // Get the field schema from the main schema
      const fieldSchema = this.getFieldSchema(fieldName);
      if (fieldSchema) {
        fieldSchema.parse(value);
        this.clearFieldError(input);
        return true;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors[0]?.message || "Invalid value";
        this.setFieldError(input, message);
        return false;
      }
    }

    return true;
  }

  private validateForm(): boolean {
    const formData = new FormData(this.form);
    const data: Record<string, any> = {};

    // Extract form data
    for (const [key, value] of formData.entries()) {
      if (key === "csrf_token") continue;

      // Handle different field types
      const input = this.form.querySelector(
        `[name="${key}"]`
      ) as HTMLInputElement;
      if (input) {
        data[key] = this.getFieldValue(input);
      }
    }

    try {
      this.schema.parse(data);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Set errors for all invalid fields
        error.errors.forEach((err) => {
          const fieldName = err.path[0]?.toString();
          if (fieldName) {
            const input = this.form.querySelector(
              `[name="${fieldName}"]`
            ) as HTMLInputElement;
            if (input) {
              this.setFieldError(input, err.message);
            }
          }
        });
        return false;
      }
    }

    return false;
  }

  private getFieldValue(input: HTMLInputElement): any {
    if (input.type === "checkbox") {
      return input.checked;
    }
    if (input.type === "number") {
      return input.value === "" ? undefined : parseFloat(input.value);
    }
    if (input.type === "radio") {
      const checked = this.form.querySelector(
        `input[name="${input.name}"]:checked`
      ) as HTMLInputElement;
      return checked?.value || "";
    }
    return input.value || undefined;
  }

  private getFieldSchema(fieldName: string): z.ZodSchema<any> | null {
    // This is a simplified approach - in practice, you'd need to extract
    // the specific field schema from your main schema
    try {
      // Check if it's a ZodObject with a shape property
      if (this.schema instanceof z.ZodObject) {
        const shape = this.schema.shape as Record<string, z.ZodSchema<any>>;
        return shape[fieldName] || null;
      }

      // Check if it's wrapped in ZodEffects (from .refine(), .transform(), etc.)
      if (this.schema instanceof z.ZodEffects) {
        const innerSchema = this.schema._def.schema;
        if (innerSchema instanceof z.ZodObject) {
          const shape = innerSchema.shape as Record<string, z.ZodSchema<any>>;
          return shape[fieldName] || null;
        }
      }
    } catch {
      // Fallback for complex schemas
    }
    return null;
  }

  private setFieldError(input: HTMLInputElement, message: string) {
    const fieldName = input.name;
    this.errors.set(fieldName, message);

    // Add error styling
    input.classList.add("border-red-500", "ring-red-500");
    input.classList.remove("border-gray-300");

    // Display error message
    const errorElement = document.getElementById(`${fieldName}-error`);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove("hidden");
    }

    // Set aria-invalid
    input.setAttribute("aria-invalid", "true");
  }

  private clearFieldError(input: HTMLInputElement) {
    const fieldName = input.name;
    this.errors.delete(fieldName);

    // Remove error styling
    input.classList.remove("border-red-500", "ring-red-500");
    input.classList.add("border-gray-300");

    // Clear error message
    const errorElement = document.getElementById(`${fieldName}-error`);
    if (errorElement) {
      errorElement.textContent = "";
      errorElement.classList.add("hidden");
    }

    // Remove aria-invalid
    input.removeAttribute("aria-invalid");
  }

  private focusFirstError() {
    const firstErrorField = Array.from(this.errors.keys())[0];
    if (firstErrorField) {
      const input = this.form.querySelector(
        `[name="${firstErrorField}"]`
      ) as HTMLInputElement;
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  public hasErrors(): boolean {
    return this.errors.size > 0;
  }

  public getErrors(): Record<string, string> {
    return Object.fromEntries(this.errors);
  }
}

/**
 * Enhanced form field component with built-in validation
 */
export interface ValidatedFieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: z.ZodSchema<any>;
  className?: string;
  helpText?: string;
}

/**
 * Real-time validation for individual fields
 */
export function validateFieldRealTime(
  input: HTMLInputElement,
  schema: z.ZodSchema<any>
): { isValid: boolean; error?: string } {
  try {
    const value =
      input.type === "checkbox"
        ? input.checked
        : input.type === "number"
          ? input.value === ""
            ? 0
            : parseFloat(input.value)
          : input.value;

    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message || "Invalid value",
      };
    }
    return { isValid: false, error: "Validation failed" };
  }
}

/**
 * Utility to sanitize and prepare form data for submission
 */
export function sanitizeFormData(
  formData: FormData,
  schema: z.ZodSchema<any>
): any {
  const data: Record<string, any> = {};

  for (const [key, value] of formData.entries()) {
    if (key === "csrf_token") {
      data[key] = value;
      continue;
    }

    // Handle different value types
    if (typeof value === "string") {
      // Convert empty strings to undefined for optional fields
      if (value.trim() === "") {
        data[key] = undefined;
      }
      // Try to convert numbers
      else if (/^\d+(\.\d+)?$/.test(value)) {
        data[key] = parseFloat(value);
      }
      // Convert boolean strings
      else if (value === "true") {
        data[key] = true;
      } else if (value === "false") {
        data[key] = false;
      } else {
        data[key] = value.trim();
      }
    } else {
      data[key] = value;
    }
  }

  // Validate and return sanitized data
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors[0]?.message}`);
    }
    throw error;
  }
}

/**
 * Progressive enhancement for forms - adds validation to existing forms
 */
export function enhanceFormWithValidation(
  formSelector: string,
  schema: z.ZodSchema<any>
): FormValidator | null {
  const form = document.querySelector(formSelector) as HTMLFormElement;
  if (!form) {
    console.warn(`Form not found: ${formSelector}`);
    return null;
  }

  return new FormValidator(form, schema);
}

/**
 * Debounced validation for expensive operations
 */
export function createDebouncedValidator(
  validator: (value: any) => Promise<{ isValid: boolean; error?: string }>,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (value: any): Promise<{ isValid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const result = await validator(value);
        resolve(result);
      }, delay);
    });
  };
}

/**
 * Form state manager for complex multi-step forms
 */
export class MultiStepFormValidator {
  private schemas: Record<number, z.ZodSchema<any>>;
  private currentStep: number = 0;
  private formData: Record<string, any> = {};

  constructor(stepSchemas: Record<number, z.ZodSchema<any>>) {
    this.schemas = stepSchemas;
  }

  validateStep(
    step: number,
    data: Record<string, any>
  ): { isValid: boolean; errors?: z.ZodError } {
    const schema = this.schemas[step];
    if (!schema) {
      throw new Error(`No schema defined for step ${step}`);
    }

    try {
      schema.parse(data);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, errors: error };
      }
      throw error;
    }
  }

  canProceedToStep(targetStep: number): boolean {
    // Validate all steps up to the target step
    for (let step = 0; step < targetStep; step++) {
      const result = this.validateStep(step, this.formData);
      if (!result.isValid) {
        return false;
      }
    }
    return true;
  }

  updateStepData(step: number, data: Record<string, any>) {
    this.formData = { ...this.formData, ...data };
    this.currentStep = step;
  }

  getValidationSummary(): Record<
    number,
    { isValid: boolean; errors?: string[] }
  > {
    const summary: Record<number, { isValid: boolean; errors?: string[] }> = {};

    Object.keys(this.schemas).forEach((stepKey) => {
      const step = parseInt(stepKey);
      const result = this.validateStep(step, this.formData);

      summary[step] = {
        isValid: result.isValid,
        errors: result.errors?.errors.map((err) => err.message),
      };
    });

    return summary;
  }
}

// Export types for use in components
export type ValidationResult = {
  isValid: boolean;
  error?: string;
};

export type FormValidationState = {
  errors: Record<string, string>;
  isValid: boolean;
  touchedFields: Set<string>;
};
