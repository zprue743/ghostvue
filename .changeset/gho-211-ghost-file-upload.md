---
'@ghostvue/vue': minor
---

Add headless `GhostFileUpload` with `GhostFileUploadDropzone`, `GhostFileUploadTrigger`, `GhostFileUploadList`, `GhostFileUploadItem`, `GhostFileUploadItemRemove`, and `useGhostFileUpload`. It keeps a controlled or uncontrolled `File[]`, checks `accept`, `maxFileSize`, a synchronous `validate`, and `maxFiles` in input order, appends accepted files, and reports each rejected file through `reject` and the slot's `rejections`. Browse and drop share one intake path; `addFiles` is public for custom paste or drop surfaces. With `name`, a visually hidden file input mirror carries the files into native submit and `FormData`, with `required`, `form`, and form reset. Outcomes are announced through a polite live region with typed, reactive `messages`. Focus moves to a neighbor after removal, and a shared document drop guard keeps a missed drop from navigating the page. Client-side checks are UX, not a security control.
