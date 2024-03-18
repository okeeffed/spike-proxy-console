function piiProxy<T extends object>(
  target: T,
  propertyRegexes: RegExp[] = []
): T {
  const piiRedactionHandler: ProxyHandler<T> = {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (typeof value === "object" && value !== null) {
        // Recursively wrap nested objects in a new proxy to apply the same PII redaction logic
        return piiProxy(value, propertyRegexes);
      }

      if (propertyRegexes.some((regex) => regex.test(property.toString()))) {
        return "[REDACTED]";
      }

      if (typeof value === "string") {
        if (/name/i.test(property.toString())) {
          return "[REDACTED]";
        }
        // Apply PII redaction logic to string values
        // Example: Redact email addresses or other identifiable information
        return value.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          "[REDACTED]"
        );
      }

      return value;
    },
    // Add other traps as needed, like set, to further manage the behavior of the proxied object
  };

  return new Proxy(target, piiRedactionHandler);
}

// Example usage
const user = {
  name: "John Doe",
  email: "john.doe@example.com",
  nested: {
    confidential: "This is a secret message.",
    email: "nested.email@example.com",
  },
};

// Original console.log
// const proxiedUser = piiProxy(user, [/confidential/i]);
// console.log(proxiedUser);

// Override console.log
const originalConsoleLog = console.log;
console.log = (...args) => {
  const processedArgs = args.map((arg) => {
    if (typeof arg === "object" && arg !== null) {
      // Apply the proxy to objects
      return piiProxy(arg);
    }
    return arg;
  });

  // Call the original console.log with the processed arguments
  originalConsoleLog.apply(console, processedArgs);
};

console.log(user); // Output: [REDACTED]
