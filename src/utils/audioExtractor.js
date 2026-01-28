import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

/**
 * Extracts audio using "Stream Copy" for maximum speed.
 * Falls back to fast encoding if copy fails.
 */
export const extractAudio = async (videoFile, onProgress) => {
    try {
        if (!ffmpeg.loaded) {
            await ffmpeg.load();
        }

        const inputName = 'input.mp4';
        // We switch to .m4a (AAC) which is the native audio format for most MP4s
        const outputName = 'output.m4a';

        // Write file to memory
        await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        // Track progress
        ffmpeg.on('progress', ({ progress }) => {
            if (onProgress) onProgress(Math.round(progress * 100));
        });

        // --- THE SPEED FIX ---
        // OLD: ['-i', inputName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputName] (Slow)
        // NEW: ['-i', inputName, '-vn', '-c:a', 'copy', outputName] (Instant)
        // This copies the audio stream directly without re-encoding.
        try {
            console.log("🚀 Attempting High-Speed Stream Copy...");
            await ffmpeg.exec(['-i', inputName, '-vn', '-c:a', 'copy', outputName]);
        } catch (copyError) {
            console.warn("Stream copy failed (likely incompatible codec). Falling back to fast encoding.", copyError);
            // Fallback: Fast AAC encoding if copy fails
            await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'aac', '-b:a', '128k', outputName]);
        }

        // Read the result
        const data = await ffmpeg.readFile(outputName);

        // Create the file object (M4A/AAC)
        const audioBlob = new Blob([data.buffer], { type: 'audio/mp4' });
        const audioFile = new File([audioBlob], "extracted_audio.m4a", { type: "audio/mp4" });

        return audioFile;

    } catch (error) {
        console.error("FFmpeg Error:", error);
        throw new Error("Extraction failed.");
    }
};