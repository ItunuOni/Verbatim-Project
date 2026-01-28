import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

/**
 * Extracts audio using optimized settings for Speech AI (Mono, 16kHz, 64kbps).
 * This ensures fastest upload and fastest AI processing.
 * Also preserves the original filename.
 */
export const extractAudio = async (videoFile, onProgress) => {
    try {
        if (!ffmpeg.loaded) {
            await ffmpeg.load();
        }

        const inputName = 'input.mp4';
        const outputName = 'output.mp3';

        // Write file to memory
        await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        // Track progress
        ffmpeg.on('progress', ({ progress }) => {
            if (onProgress) onProgress(Math.round(progress * 100));
        });

        // --- OPTIMIZED SPEECH EXTRACTION ---
        // 1. -vn: Drop video (Extract Audio Only)
        // 2. -ac 1: Downmix to Mono (Reduces size by 50%)
        // 3. -ar 16000: Resample to 16kHz (Ideal for Speech-to-Text)
        // 4. -b:a 64k: Bitrate 64kbps (Tiny file size, clear voice)
        // 5. -codec:a libmp3lame: Standard MP3 encoding
        console.log("🚀 Starting Optimized Speech Extraction...");
        
        await ffmpeg.exec([
            '-i', inputName, 
            '-vn', 
            '-ac', '1', 
            '-ar', '16000',
            '-b:a', '64k',
            '-codec:a', 'libmp3lame',
            outputName
        ]);

        // Read the result
        const data = await ffmpeg.readFile(outputName);

        // --- DYNAMIC FILENAME LOGIC ---
        // 1. Get original name (e.g., "Reacher_S03.mp4")
        // 2. Remove the last extension
        // 3. Add .mp3
        const originalName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || videoFile.name;
        const finalFileName = `${originalName}.mp3`;

        // Create the file object with the CORRECT name
        const audioBlob = new Blob([data.buffer], { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], finalFileName, { type: "audio/mp3" });

        return audioFile;

    } catch (error) {
        console.error("FFmpeg Error:", error);
        throw new Error("Extraction failed.");
    }
};