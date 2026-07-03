import { useState } from "react";
import { backend } from "../../../../api/backend";

export type UploadProgress = { current: number; total: number; filePct: number };

// XHR-with-progress, shared by the audio and image upload flows in
// ReviewModal — same sequence in both, just different fields on the
// FormData. Uploads sequentially so progress is meaningful per file.
export function useMediaUpload(uploadPath: string) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress]   = useState<UploadProgress>({ current: 0, total: 0, filePct: 0 });

    const uploadOne = (form: FormData, index: number, total: number): Promise<boolean> =>
        new Promise(resolve => {
            const token = backend.authToken();
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", e => {
                if (e.lengthComputable)
                    setProgress({ current: index, total, filePct: Math.round((e.loaded / e.total) * 100) });
            });
            xhr.addEventListener("load", () => resolve(xhr.status >= 200 && xhr.status < 300));
            xhr.addEventListener("error", () => resolve(false));
            xhr.open("POST", backend.uploadUrl(uploadPath));
            if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            xhr.send(form);
        });

    // Uploads files one at a time; buildFormData turns each file into the
    // request body. Returns whether every file uploaded successfully.
    const upload = async (files: File[], buildFormData: (file: File, index: number) => FormData): Promise<boolean> => {
        setUploading(true);
        let allOk = true;
        for (let i = 0; i < files.length; i++) {
            setProgress({ current: i + 1, total: files.length, filePct: 0 });
            const ok = await uploadOne(buildFormData(files[i], i), i + 1, files.length);
            allOk = allOk && ok;
        }
        setUploading(false);
        return allOk;
    };

    return { uploading, progress, upload };
}
