---
name: react-best-practices
description: |
  Modern React standards, component architecture, hooks usage, performance optimization, state management, render prevention, server/client boundary separation, and type safety guidelines.

  Trigger whenever:
  - Writing, refactoring, or reviewing React components, custom hooks, or state architecture.
  - Optimizing re-renders, memory usage, bundle size, or async data fetching.
  - Designing component patterns (Compound components, Render props, Polymorphic components).
  - Setting up Next.js or Vite React application structures.
---

# React Best Practices Skill

A comprehensive standard and reference guide for writing modern, maintainable, performant, and type-safe React applications.

---

## 1. Architecture & Component Patterns

### A. Compound Components Pattern
Use compound components for cohesive UI widgets (Tabs, Accordions, Dropdowns, Modals) sharing implicit context:
```tsx
const SelectContext = createContext<SelectContextProps | null>(null);

export function Select({ value, onChange, children }: SelectProps) {
  return <SelectContext.Provider value={{ value, onChange }}>{children}</SelectContext.Provider>;
}

Select.Option = function Option({ value, children }: OptionProps) {
  const ctx = useContext(SelectContext);
  const isSelected = ctx?.value === value;
  return (
    <div onClick={() => ctx?.onChange(value)} data-selected={isSelected}>
      {children}
    </div>
  );
};
```

### B. Single Responsibility & Logic Separation
- Keep JSX clean and presentational. Move business logic, event handlers, and data fetching into custom hooks (`useTradeHistory`, `useAuthForm`).
- Avoid giant 500-line single-file components. Break down into focused sub-components.

---

## 2. State Management Rules

1. **Avoid Derived State in `useState`**:
   - ❌ **Anti-pattern**: `const [fullName, setFullName] = useState(firstName + ' ' + lastName);`
   - ✅ **Correct**: `const fullName = `${firstName} ${lastName}`;` (compute on the fly during render).

2. **Server Data vs Client UI State**:
   - Use **TanStack Query / SWR** for server state (caching, revalidation, optimistic updates).
   - Use **Zustand** or **React Context** for global UI state (theme, sidebar open state, user preferences).
   - Use `useState` strictly for localized component UI state (modal visibility, form input values).

3. **Immutability & Functional Updates**:
   - When updating state based on previous state, always use functional form: `setCount(prev => prev + 1)`.

---

## 3. Hooks Safety & Performance

### A. Rules of Hooks
- Call hooks only at the top level of function components or custom hooks.
- Never call hooks inside loops, conditions, or nested functions.

### B. Dependency Array Discipline
- Include all reactive values used inside `useEffect`, `useCallback`, and `useMemo`.
- Never disable `eslint-plugin-react-hooks` rules.
- If an effect runs continuously, refactor the effect to listen to actual state triggers or move logic into an event handler.

### C. Smart Optimization (`useMemo`, `useCallback`, `React.memo`)
- Do **not** wrap every primitive callback in `useCallback`. Use it when passing callbacks to `React.memo`ized children or hook dependency arrays.
- Use `useMemo` for expensive computations (filtering 1,000+ items, complex calculations).

---

## 4. Concurrent React & Streaming

- **`useTransition`**: Mark non-urgent UI updates (e.g. tab switching, search filtering) as transitions to keep input typing fluid at 60fps.
- **`useDeferredValue`**: Defer updating heavy visual sections while typing in a search bar.
- **Suspense Boundaries**: Wrap async components/data fetching boundaries with granular `<Suspense fallback={<Skeleton />}>`.

---

## 5. TypeScript Integration

- Explicitly type component props using `interface` or `type`.
- Prefer strict event types: `React.MouseEvent<HTMLButtonElement>`, `React.ChangeEvent<HTMLInputElement>`.
- Use generic components for flexible reusable primitives.
