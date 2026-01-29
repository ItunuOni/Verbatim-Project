import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

/**
 * Extracts audio using "Direct Stream Copy" to .m4a container.
 * This is the ONLY way to get "Instant" speed on mobile devices without corruption.
 */
export const extractAudio = async (videoFile, onProgress) => {
    try {
        if (!ffmpeg.loaded) {
            await ffmpeg.load();
        }

        const inputName = 'input.mp4';
        const outputName = 'output.m4a'; // CHANGED: .m4a is safer for Stream Copy (AAC)

        // Write file to memory
        await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        // Track progress
        ffmpeg.on('progress', ({ progress }) => {
            if (onProgress) onProgress(Math.round(progress * 100));
        });

        // --- DYNAMIC FILENAME LOGIC ---
        // Get original name (e.g., "Movie.mkv") -> "Movie.m4a"
        const originalName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || videoFile.name;
        const finalFileName = `${originalName}.m4a`;

        console.log("🚀 Starting Instant Stream Copy...");

        // --- STRATEGY: INSTANT COPY (SAFE MODE) ---
        // We output to .m4a which natively supports the AAC audio found in 99% of mp4/mkv/mov files.
        // This avoids the CPU-heavy conversion that freezes mobile devices.
        try {
            await ffmpeg.exec(['-i', inputName, '-vn', '-c:a', 'copy', outputName]);
        } catch (copyError) {
            console.warn("Stream copy failed. Falling back to Fast AAC Encode.", copyError);
            // Fallback: Fast AAC encoding (supported by all browsers/backends)
            await ffmpeg.exec([
                '-i', inputName, 
                '-vn', 
                '-ac', '1', 
                '-ar', '16000', 
                '-c:a', 'aac', 
                '-b:a', '64k', 
                outputName
            ]);
        }

        // Read the result
        const data = await ffmpeg.readFile(outputName);

        // Create the file object
        const audioBlob = new Blob([data.buffer], { type: 'audio/m4a' });
        const audioFile = new File([audioBlob], finalFileName, { type: "audio/m4a" });

        return audioFile;

    } catch (error) {
        console.error("FFmpeg Error:", error);
        throw new Error("Extraction failed.");
    }
};