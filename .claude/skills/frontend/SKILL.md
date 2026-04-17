---
name: frontend
description: >
    Use when writing React components, pages, UI, forms, hooks, or any frontend
    TypeScript code. Enforces shadcn/ui, Tailwind CSS, small modular files, and
    zero custom CSS. Auto-loads for any file under /frontend or *.tsx / *.ts.
---

# Frontend conventions

## Core principles

- One component per file. One responsibility per component.
- Files stay under ~150 lines. Split when they grow larger.
- Business logic lives in hooks, not in JSX.
- Always prefer an existing shadcn component or library over building from scratch.
- Simple logic only in components — complex derivations go in lib/ utilities.

---

## Component library — shadcn/ui

Never build buttons, inputs, dialogs, tables, selects, or any common UI primitive
from scratch. Always install from shadcn first.

```bash
npx shadcn@latest add button input textarea label
npx shadcn@latest add dialog sheet card form
npx shadcn@latest add select table toast
npx shadcn@latest add dropdown-menu popover command
npx shadcn@latest add badge avatar skeleton separator
npx shadcn@latest add tabs alert progress
```

Rules:

- Check src/components/ui/ before creating any UI primitive.
- Extend shadcn via className prop + Tailwind — never edit files in components/ui/.
- Forms: always react-hook-form + zod + shadcn <Form>.
- Combobox / autocomplete: <Command> + <Popover>.
- Data tables with sorting/pagination: @tanstack/react-table + shadcn <Table>.

---

## Styling — Tailwind only

- Tailwind utility classes exclusively. Zero style={} props.
- No custom CSS files unless overriding a third-party lib (add a comment why).
- Use cn() from lib/utils for all conditional class merging.
- Follow responsive prefixes: sm: md: lg: xl:
- Dark mode via dark: prefix — never hardcode light/dark colors.
- Avoid arbitrary values like w-[347px] — use standard tokens.

---

## Folder structure

```
src/
  components/
    ui/              <- shadcn generated — NEVER edit
    common/          <- shared across features (PageHeader, EmptyState)
    features/        <- feature-scoped (UserCard, OrderTable, ProductForm)
  hooks/             <- custom React hooks (useAuth, useDebounce, usePagination)
  lib/
    utils.ts         <- cn(), formatDate, formatCurrency, pure helpers
    api.ts           <- base fetch client, error normalization
    validations.ts   <- shared zod schemas
  pages/             <- route-level components, thin, delegate to features/
  types/             <- shared TypeScript interfaces
  store/             <- Zustand stores (genuinely global UI state only)
```

---

## Component rules

- Named exports only. No default exports anywhere.
- Props interface at the top of every file.
- Keep components pure — no side effects in render body.
- Extract repeated JSX into a named sub-component.
- Prefer composition (children/slots) over large prop objects.
- No any — use unknown and narrow it.
- All event handlers typed explicitly.

### Example component

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UserCardProps {
    name: string;
    email: string;
    role: "admin" | "member" | "viewer";
    className?: string;
}

export function UserCard({ name, email, role, className }: UserCardProps) {
    return (
        <Card className={cn("w-full", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{name}</CardTitle>
                <Badge variant={role === "admin" ? "default" : "secondary"}>
                    {role}
                </Badge>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{email}</p>
            </CardContent>
        </Card>
    );
}
```

---

## Forms — react-hook-form + zod + shadcn

Never manage form state with useState.

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const schema = z.object({
    name: z.string().min(2, "Min 2 characters"),
    email: z.string().email("Invalid email"),
});
type FormValues = z.infer<typeof schema>;

interface CreateUserFormProps {
    onSubmit: (values: FormValues) => Promise<void>;
}

export function CreateUserForm({ onSubmit }: CreateUserFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", email: "" },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Jane Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting
                        ? "Creating..."
                        : "Create user"}
                </Button>
            </form>
        </Form>
    );
}
```

---

## Data fetching — React Query

All server state uses @tanstack/react-query. Never fetch in useEffect.

```ts
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User, CreateUserRequest } from "@/types";

export function useUsers() {
    return useQuery({
        queryKey: ["users"],
        queryFn: () => api.get<User[]>("/users"),
    });
}

export function useCreateUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateUserRequest) => api.post<User>("/users", body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    });
}
```

Query key conventions:

- List: ['users']
- Single: ['users', id]
- Filtered list: ['users', { role, page }]

Always invalidate relevant query keys after mutations.

---

## State management

| Scope           | Tool                  |
| --------------- | --------------------- |
| Component-local | useState / useReducer |
| Server / async  | React Query           |
| Global UI state | Zustand               |
| Form state      | react-hook-form       |

Zustand rules: one store per concern, flat state, actions inside the store.

```ts
// src/store/sidebar.ts
import { create } from "zustand";

interface SidebarStore {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
    isOpen: true,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
```

---

## API client

```ts
// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL;

class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        ...init,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.error ?? "Request failed");
    }
    return res.json();
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
        request<T>(path, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) =>
        request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

---

## Error and loading states

- Use React Query isError / error — no try/catch in components.
- Errors: shadcn <Alert variant="destructive">.
- Loading: shadcn <Skeleton>.
- Route-level error boundaries for unhandled errors.
- Mutation feedback: shadcn useToast.

---

## Do not

- No useEffect for data fetching.
- No useState for server data.
- No any types.
- No style={} props.
- No editing components/ui/.
- No default exports.
- No business logic inside JSX.
