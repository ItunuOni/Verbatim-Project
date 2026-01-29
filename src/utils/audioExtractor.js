import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

/**
 * Extracts audio using "Direct Stream Copy" for maximum speed.
 * This is the "5-second" method required for mobile/tablet devices.
 */
export const extractAudio = async (videoFile, onProgress) => {
    try {
        if (!ffmpeg.loaded) {
            await ffmpeg.load();
        }

        const inputName = 'input.mp4';
        const outputName = 'output.mp3'; // We'll try to copy to MP3 container

        // Write file to memory
        await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        // Track progress
        ffmpeg.on('progress', ({ progress }) => {
            if (onProgress) onProgress(Math.round(progress * 100));
        });

        // --- DYNAMIC FILENAME LOGIC ---
        const originalName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || videoFile.name;
        const finalFileName = `${originalName}.mp3`;

        // --- STRATEGY: TRY STREAM COPY FIRST (INSTANT) ---
        // This copies the audio stream directly without re-encoding (CPU-light).
        try {
            console.log("🚀 Attempting High-Speed Stream Copy...");
            await ffmpeg.exec(['-i', inputName, '-vn', '-c:a', 'copy', outputName]);
        } catch (copyError) {
            console.warn("Stream copy failed. Falling back to fast encode.", copyError);
            // Fallback: Very fast MP3 encoding (low complexity)
            await ffmpeg.exec(['-i', inputName, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k', outputName]);
        }

        // Read the result
        const data = await ffmpeg.readFile(outputName);

        // Create the file object
        const audioBlob = new Blob([data.buffer], { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], finalFileName, { type: "audio/mp3" });

        return audioFile;

    } catch (error) {
        console.error("FFmpeg Error:", error);
        throw new Error("Extraction failed.");
    }
};