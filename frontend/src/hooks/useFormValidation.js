import { useState, useCallback } from 'react';

const validators = {
  required: (value) => (!value || (typeof value === 'string' && !value.trim())) ? 'This field is required' : null,
  email: (value) => value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email address' : null,
  minLength: (min) => (value) => value && value.length < min ? `Must be at least ${min} characters` : null,
  maxLength: (max) => (value) => value && value.length > max ? `Must be at most ${max} characters` : null,
  pattern: (regex, msg) => (value) => value && !regex.test(value) ? (msg || 'Invalid format') : null,
  custom: (fn) => fn
};

const useFormValidation = (rules = {}) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback((name, value) => {
    const fieldRules = rules[name];
    if (!fieldRules) return null;

    for (const rule of fieldRules) {
      let validator;
      if (typeof rule === 'string') {
        validator = validators[rule];
      } else if (typeof rule === 'object') {
        const { type, ...params } = rule;
        if (type === 'minLength') validator = validators.minLength(params.value);
        else if (type === 'maxLength') validator = validators.maxLength(params.value);
        else if (type === 'pattern') validator = validators.pattern(params.value, params.message);
        else if (type === 'custom') validator = validators.custom(params.validate);
        else validator = validators[type];
      } else if (typeof rule === 'function') {
        validator = rule;
      }

      if (validator) {
        const error = validator(value);
        if (error) return error;
      }
    }
    return null;
  }, [rules]);

  const validate = useCallback((data) => {
    const newErrors = {};
    let valid = true;

    for (const [name, fieldRules] of Object.entries(rules)) {
      const error = validateField(name, data[name]);
      if (error) {
        newErrors[name] = error;
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  }, [rules, validateField]);

  const touchField = useCallback((name, value) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => {
      if (error) return { ...prev, [name]: error };
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  }, [validateField]);

  const isValid = Object.keys(errors).length === 0;

  return { errors, validate, isValid, touchField, touched, setErrors };
};

export default useFormValidation;
