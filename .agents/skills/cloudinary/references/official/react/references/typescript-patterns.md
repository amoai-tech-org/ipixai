# TypeScript Patterns

Complete TypeScript patterns for Cloudinary React integration.

## Type Imports

```tsx
import type { CloudinaryImage, CloudinaryVideo } from '@cloudinary/url-gen';

const img: CloudinaryImage = cld.image('id');
const video: CloudinaryVideo = cld.video('id');
```

## Upload Result Types

```tsx
interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
  created_at: string;
}

// Type callbacks
onUploadSuccess?: (result: CloudinaryUploadResult) => void;
```

❌ WRONG: `onUploadSuccess?: (result: any) => void`
✅ CORRECT: Use proper interface

## Environment Variable Typing

Create `vite-env.d.ts`:

```tsx
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUDINARY_CLOUD_NAME: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Type Guards

```tsx
function getUploadWidgetFactory() {
  if (typeof window === 'undefined') return null;
  const createUploadWidget = window.cloudinary?.createUploadWidget;
  return typeof createUploadWidget === 'function' ? createUploadWidget : null;
}

// Always poll in useEffect with timeout and cleanup
const interval = setInterval(() => {
  const createUploadWidget = getUploadWidgetFactory();
  if (createUploadWidget) {
    clearInterval(interval);
    clearTimeout(timeout);
    createUploadWidget(widgetOptions, handleWidgetResult);
  }
}, 100);
```

## Ref Typing

```tsx
// Video element
const videoRef = useRef<HTMLVideoElement>(null);

// Button
const buttonRef = useRef<HTMLButtonElement>(null);

// Widget (use unknown if types not available)
const widgetRef = useRef<unknown>(null);
```

## Type Narrowing

```tsx
const preset = uploadPreset || undefined; // Type: string | undefined

if (uploadPreset) {
  // TypeScript knows uploadPreset is string here
  console.log(preset.length);
}
```

## Avoid `any` Type

❌ WRONG: `const result: any = ...`
✅ CORRECT: Use proper interface or `unknown` with type guards

```tsx
function handleResult(result: unknown) {
  if (result && typeof result === 'object' && 'public_id' in result) {
    const uploadResult = result as CloudinaryUploadResult;
    // Use uploadResult
  }
}
```

## Window Type Declaration

```tsx
interface UploadWidgetOptions {
  cloudName: string;
  uploadPreset?: string;
  [key: string]: unknown;
}

interface UploadWidgetInstance {
  open(): void;
  close?(): void;
}

type UploadWidgetCallback = (error: unknown, result: unknown) => void;

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (config: UploadWidgetOptions, callback: UploadWidgetCallback) => UploadWidgetInstance;
    };
  }
}
```

## Common TypeScript Errors

### "Property 'cloudinary' does not exist on type 'Window'"
✅ Add global type declaration above

### "Property 'VITE_CLOUDINARY_CLOUD_NAME' does not exist"
✅ Create `vite-env.d.ts` with ImportMetaEnv interface

### "Type 'null' is not assignable to type 'RefObject'"
✅ Use proper HTML element type: `useRef<HTMLVideoElement>(null)`

### "Parameter implicitly has 'any' type"
✅ Define proper interface for callbacks and results
