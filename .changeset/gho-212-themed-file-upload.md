---
'@ghostvue/themes': minor
---

Add themed `GhostFileUpload`, `GhostFileUploadDropzone`, `GhostFileUploadTrigger`, `GhostFileUploadList`, and `GhostFileUploadItemRemove` wrappers, and re-export `GhostFileUploadItem` and `useGhostFileUpload`. `ghost-file-upload.css` adds a token-based dropzone with idle, hover, dragging, invalid, and disabled states, a neutral trigger and quiet remove buttons with 44px minimum targets and a visible focus ring, bordered list items, motion only when reduced motion is not requested, and forced-colors support. Rules key on the wrappers' `data-themed` marker, so headless parts stay unstyled.
